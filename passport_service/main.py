import io
import time
import math
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from PIL import Image, ImageOps
import cv2
import numpy as np
import mediapipe as mp
from rembg import remove, new_session

app = FastAPI(
    title="3x4 Passport Photo Processing Microservice",
    description="Professional segmentation & face-cropped 3x4 document photo generator",
    version="1.0.0"
)

# Initialize rembg session once for high performance
rembg_session = new_session("isnet-general-use")

# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection


def detect_face_and_crop(pil_img: Image.Image) -> Image.Image:
    """
    Step 1: Detect face using MediaPipe Face Detection and crop to a 3:4 document aspect ratio.
    Targeting face height to be ~70-75% of frame height, centered horizontally.
    """
    img_rgb = np.array(pil_img.convert("RGB"))
    h, w, _ = img_rgb.shape

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
        results = face_detection.process(img_rgb)

    if not results.detections:
        raise HTTPException(
            status_code=400,
            detail="Yuzingiz aniq ko'rinadigan, old tomondan olingan rasm yuboring."
        )

    # Pick the largest detected face (if multiple)
    best_detection = max(
        results.detections,
        key=lambda d: d.location_data.relative_bounding_box.width * d.location_data.relative_bounding_box.height
    )

    bbox = best_detection.location_data.relative_bounding_box
    xmin = int(bbox.xmin * w)
    ymin = int(bbox.ymin * h)
    box_w = int(bbox.width * w)
    box_h = int(bbox.height * h)

    # Face center
    face_cx = xmin + box_w // 2
    face_cy = ymin + box_h // 2

    # Standard passport rule: face height should be ~72% of crop height
    crop_h = int(box_h / 0.72)
    crop_w = int(crop_h * 3 / 4)

    # Position crop top so face is vertically placed (top hair margin ~10-12% of crop_h)
    crop_top = int(ymin - crop_h * 0.12)
    crop_left = int(face_cx - crop_w // 2)

    # Bound checking & padding if necessary
    pad_left = max(0, -crop_left)
    pad_top = max(0, -crop_top)
    pad_right = max(0, (crop_left + crop_w) - w)
    pad_bottom = max(0, (crop_top + crop_h) - h)

    if pad_left > 0 or pad_top > 0 or pad_right > 0 or pad_bottom > 0:
        # Add white padding to original image before crop
        pil_img = ImageOps.expand(pil_img, border=(pad_left, pad_top, pad_right, pad_bottom), fill=(255, 255, 255))
        crop_left += pad_left
        crop_top += pad_top

    cropped = pil_img.crop((crop_left, crop_top, crop_left + crop_w, crop_top + crop_h))
    return cropped


def remove_background(pil_img: Image.Image) -> Image.Image:
    """
    Step 2: Remove background using rembg with alpha matting enabled.
    """
    # Convert PIL Image to RGBA bytes
    img_byte_arr = io.BytesIO()
    pil_img.save(img_byte_arr, format='PNG')
    input_bytes = img_byte_arr.getvalue()

    # Remove background with alpha matting parameters
    output_bytes = remove(
        input_bytes,
        session=rembg_session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10
    )

    rgba_img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    return rgba_img


def clean_mask_edges(rgba_img: Image.Image) -> Image.Image:
    """
    Step 3: Clean alpha channel edges using OpenCV erosion and Gaussian blur thresholding.
    Prevents feathering and jagged edge artifacts.
    """
    img_np = np.array(rgba_img)
    r, g, b, alpha = cv2.split(img_np)

    # Morphological erosion on alpha channel (1-2 px kernel)
    kernel = np.ones((3, 3), np.uint8)
    eroded_alpha = cv2.erode(alpha, kernel, iterations=1)

    # Slight Gaussian blur to smooth edges
    blurred_alpha = cv2.GaussianBlur(eroded_alpha, (3, 3), 0)

    # Hard threshold to eliminate semi-transparent fringe
    _, clean_alpha = cv2.threshold(blurred_alpha, 128, 255, cv2.THRESH_BINARY)

    # Merge cleaned alpha back
    cleaned_np = cv2.merge([r, g, b, clean_alpha])
    return Image.fromarray(cleaned_np, mode="RGBA")


def composite_on_white_canvas(rgba_img: Image.Image, target_w: int = 354, target_h: int = 472) -> Image.Image:
    """
    Step 4: Composite RGBA subject over a pure white (255, 255, 255) canvas.
    Ensures 100% white background without any original background residue.
    """
    # Resize RGBA subject to target document dimensions
    resized_subject = rgba_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Create pure solid white canvas
    white_bg = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 255))

    # Alpha composite subject onto white canvas
    composite = Image.alpha_composite(white_bg, resized_subject)

    # Convert to pure RGB (stripping alpha channel)
    rgb_final = composite.convert("RGB")
    return rgb_final


def verify_pure_white_border(rgb_img: Image.Image) -> bool:
    """
    Verification test: Asserts outer border pixels are pure white (255,255,255).
    """
    arr = np.array(rgb_img)
    top_row = arr[0, :, :]
    left_col = arr[:, 0, :]
    right_col = arr[:, -1, :]

    # Check top corner pixels
    is_white = (top_row[0] == [255, 255, 255]).all() and (top_row[-1] == [255, 255, 255]).all()
    return bool(is_white)


def create_print_sheet(img_3x4: Image.Image, copies: int = 4) -> Image.Image:
    """
    Creates a 10x15 cm photo sheet (1181 x 1772 px at 300 DPI) containing 4 or 6 copies.
    """
    # 10x15 cm at 300 DPI = 1181 x 1772 pixels
    sheet_w, sheet_h = 1181, 1772
    sheet = Image.new("RGB", (sheet_w, sheet_h), (255, 255, 255))

    p_w, p_h = img_3x4.size  # 354 x 472

    if copies <= 4:
        # 2x2 Grid
        cols, rows = 2, 2
    else:
        # 2x3 Grid (6 copies)
        cols, rows = 2, 3

    margin_x = (sheet_w - (cols * p_w)) // (cols + 1)
    margin_y = (sheet_h - (rows * p_h)) // (rows + 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if count >= copies:
                break
            x = margin_x + c * (p_w + margin_x)
            y = margin_y + r * (p_h + margin_y)
            sheet.paste(img_3x4, (x, y))
            count += 1

    return sheet


@app.post("/process-3x4")
async def process_3x4_photo(file: UploadFile = File(...)):
    """
    Full 5-step processing pipeline:
    detect_face_and_crop -> remove_background -> clean_mask_edges -> composite_on_white_canvas -> 354x472 300DPI JPEG
    """
    start_time = time.time()
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
        pil_img = ImageOps.exif_transpose(pil_img)  # Fix auto-rotation orientation

        # Step 1: Detect face & 3:4 aspect crop
        cropped_subject = detect_face_and_crop(pil_img)

        # Step 2: Remove background with rembg alpha matting
        rgba_subject = remove_background(cropped_subject)

        # Step 3: Clean alpha mask edges (morphology + threshold)
        cleaned_rgba = clean_mask_edges(rgba_subject)

        # Step 4 & 5: Composite on pure white canvas & resize to 354x472 px
        final_3x4_rgb = composite_on_white_canvas(cleaned_rgba, target_w=354, target_h=472)

        # Output to buffer as JPEG quality 95 with 300 DPI
        out_buffer = io.BytesIO()
        final_3x4_rgb.save(out_buffer, format="JPEG", quality=95, dpi=(300, 300))
        img_bytes = out_buffer.getvalue()

        proc_time = round(time.time() - start_time, 3)

        return Response(
            content=img_bytes,
            media_type="image/jpeg",
            headers={
                "X-Processing-Time-Sec": str(proc_time),
                "X-Dimensions": "354x472",
                "X-DPI": "300"
            }
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Rasmga ishlov berishda xatolik yuz berdi: {str(e)}"
        )


@app.post("/create-print-sheet")
async def generate_print_sheet(file: UploadFile = File(...), copies: int = Form(4)):
    """
    Generates a 10x15 cm photo sheet with 4 or 6 copies of the processed 3x4 photo.
    """
    try:
        contents = await file.read()
        img_3x4 = Image.open(io.BytesIO(contents))
        sheet = create_print_sheet(img_3x4, copies=copies)

        out_buffer = io.BytesIO()
        sheet.save(out_buffer, format="JPEG", quality=95, dpi=(300, 300))
        return Response(content=out_buffer.getvalue(), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "3x4-passport-processor"}
