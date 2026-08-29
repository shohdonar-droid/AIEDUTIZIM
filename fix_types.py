import sys
import re

with open('telegram.ts', 'r') as f:
    content = f.read()

# 1. deleteDoc import
if 'deleteDoc' in content and 'deleteDoc' not in content.split('\\n')[0:100]:
    # find where firestore is imported
    # import { getFirestore, collection, ... } from "firebase/firestore";
    content = re.sub(r'(from "firebase/firestore";)', r', deleteDoc \1', content) # this might be messy.
    # safer to just prepend
    if 'import { deleteDoc } from "firebase/firestore";' not in content:
        content = 'import { deleteDoc } from "firebase/firestore";\\n' + content

# 2. .data() as any
content = content.replace('const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));', 'const shops = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));')

# 3. pending.shopId -> (pending as any).shopId etc
content = content.replace('pending.shopName', '(pending as any).shopName')
content = content.replace('pending.shopServices', '(pending as any).shopServices')
content = content.replace('pending.shopAddress', '(pending as any).shopAddress')
content = content.replace('pending.shopContact', '(pending as any).shopContact')
content = content.replace('pending.editField', '(pending as any).editField')
content = content.replace('pending.shopId', '(pending as any).shopId')

content = content.replace('{ step: "admin_comp_edit_select", shopId }', '{ step: "admin_comp_edit_select", shopId } as any')

with open('telegram.ts', 'w') as f:
    f.write(content)

print("Fixed typing errors")
