import sys
content = open('telegram.ts', 'r').read()

old_state = "userWizardStates.set(userId, { service: normText, step: 1, data: { __chargedCost: isAdmin ? 0 : chargeCost, __textCost: cost, __fileCost: 10000 } });"
new_state = "userWizardStates.set(userId, { service: normText, step: 1, data: { __chargedCost: isAdmin ? 0 : chargeCost, __textCost: cost, __fileCost: dynamicCosts['📄 Fayl tarjima qilish'] !== undefined ? dynamicCosts['📄 Fayl tarjima qilish'] : 10000 } });"

content = content.replace(old_state, new_state)
open('telegram.ts', 'w').write(content)
print("Done")
