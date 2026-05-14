import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/AdminJurnal.tsx', 'utf8');
code = code.replace(
  /const pData = quiz\.participants\.map\(\(p: any\) => \{[\s\S]*?\}\);\s*pData\.sort\(\(a,b\) => b\["To'g'ri"] - a\["To'g'ri"]\);/,
  `const pData = quiz.participants.map((p: any) => {
                                      const correctCount = Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).length;
                                      const totalTime = Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number;
                                      return {
                                        "Ism": p.displayName || p.name || 'Nomalum',
                                        "To\\'g\\'ri": correctCount,
                                        "Xato": (quiz.questions?.length || 0) - correctCount,
                                        "Sarflangan vaqt (s)": totalTime.toFixed(2)
                                      };
                                    });
                                    pData.sort((a: any, b: any) => b["To'g'ri"] - a["To'g'ri"]);`
);

code = code.replace(
  /let correctCount = 0;\s*if \(p\.answers && viewedQuizResult\.questions\) \{[\s\S]*?\}\s*return \(/g,
  `const correctCount = Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).length;
                                      return (`
);

fs.writeFileSync('src/pages/admin/AdminJurnal.tsx', code);
console.log("Replaced!");
