const topicStr = `Mavzu: IT sohasi. Slaydlar soni: 15. Dizayn turi: Zamonaviy. Qo'shimcha talablar: -`;
fetch("http://localhost:3000/api/gemini", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "generatePresentation",
    topic: topicStr,
    count: 15
  })
}).then(async res => {
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}).catch(console.error);
