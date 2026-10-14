# Commit Conventions — Step 06

> วันที่: 2026-10-14 · ฐาน: [Conventional Commits 1.0](https://www.conventionalcommits.org/) ซึ่งเป็นรูปแบบที่ repo ใช้อยู่แล้วส่วนใหญ่ [V] และเพิ่ม scope กับกฎให้สม่ำเสมอ

## 1. รูปแบบ

```
<type>(<scope>)!: <subject>

<body: ทำไม + อะไรเปลี่ยน + ผลกระทบ (wrap 72)>

<footer: Refs, BREAKING CHANGE, Co-Authored-By>
```

- **subject:** ภาษาอังกฤษ, imperative ("add", "fix" ไม่ใช่ "added"), ตัวพิมพ์เล็กขึ้นต้น, ไม่มีจุดท้าย และ ≤ 72 ตัวอักษร
- **body:** ไทยหรืออังกฤษก็ได้ (ให้คงภาษาเดียวทั้ง commit) ต้องตอบว่า **ทำไม** และอ้าง ID ของเอกสาร (ER-01, FR-HIST-05, M007 …)
- **1 commit = 1 เรื่อง** ที่ build และ test ผ่านด้วยตัวเอง

## 2. Types

| Type | ใช้เมื่อ | SemVer ที่กระทบ | เดิมใน repo |
|---|---|---|---|
| `feat` | ฟีเจอร์ใหม่หรือพฤติกรรมใหม่ที่ผู้ใช้เห็น | MINOR | ✅ |
| `fix` | แก้บั๊ก | PATCH | ✅ |
| `perf` | เร็วขึ้นโดยพฤติกรรมเท่าเดิม | PATCH | ✅ |
| `refactor` | ปรับโครงสร้างโดยพฤติกรรมเท่าเดิม | — | ✅ |
| `style` | หน้าตา UI หรือ format โค้ดที่ไม่เปลี่ยน logic | PATCH (UI) / — (format) | ✅ |
| `test` | เพิ่มหรือแก้ test | — | ✅ (`fix(tests)`) |
| `docs` | เอกสาร | — | ✅ |
| `build` | dependency, build config | PATCH ถ้ากระทบ runtime | — |
| `ci` | GitHub Actions | — | — |
| `chore` | งานดูแลอื่น ๆ (release bump, cleanup) | — | ✅ |
| `db` | migration หรือ SQL ใน `supabase/` | MINOR (expand) / MAJOR (contract ที่ทำให้ client เก่าพัง) | — (ใหม่) |
| `revert` | revert commit ก่อนหน้า (`revert: <subject เดิม>` + `This reverts commit <sha>`) | ตามของที่ revert | — |

**เลิกใช้:** `merge:` (ใช้ PR merge แทน) และ `security:` (ใช้ `fix(security):` หรือ `fix(<scope>):` + body อธิบาย)

## 3. Scopes

`auth` · `dashboard` · `debts` · `records` · `add` · `history` · `export` · `bill` · `weather` · `ui` (design system) · `nav` · `db` · `rls` · `env` · `deps` · `ci` · `release` · `docs` · `pwa` · `a11y` · `security`

## 4. Breaking changes
- เพิ่ม `!` หลัง scope และ footer `BREAKING CHANGE: <อะไร + วิธี migrate>`
- ตัวอย่างที่นับเป็น breaking ในระบบนี้: contract migration ที่ทำให้ client v1.x ใช้ไม่ได้, การเปลี่ยน URL ที่ผู้ใช้ bookmark (เช่น ลบ `/add`) และการเปลี่ยนรูปแบบไฟล์ export ที่ระบบอื่นพึ่งพา (D-16 อนุญาตให้ปรับ จึงไม่นับ)

## 5. ตัวอย่าง (อิงงานจริงของแผน)

```
fix(records): keep created_at unchanged when editing early-morning records

splitDateTime used the UTC calendar date with the local hour, so saving an
edit for a record made between 00:00 and 06:59 Asia/Bangkok moved it back
one day (ER-01). Use Asia/Bangkok for both parts and only send created_at
when the user changed date or time.

Refs: ER-01, FR-HIST-05, AC-26-1
```
```
db(rls): restrict records and expenses to app members

Refs: M002, ADR-04, ER-12
```
```
build(deps): upgrade next and eslint-config-next to 16.4.0

Refs: ER-09, S01-04
```

## 6. Footer มาตรฐาน
- `Refs: <IDs>` ต้องมีเมื่อเกี่ยวกับ requirement, risk หรือ issue
- `Co-Authored-By:` ตามผู้ร่วมเขียนจริง
- ห้ามใส่ secret, อีเมลลูกค้า หรือข้อมูลร้านจริงใน commit

## 7. การบังคับใช้
- PR title ต้องเป็นรูปแบบเดียวกัน (squash ใช้ PR title เป็น commit message) และ CI job `pr-title` ตรวจด้วย regex (ไม่เพิ่ม dependency):
  `^(feat|fix|perf|refactor|style|test|docs|build|ci|chore|db|revert)(\([a-z0-9-]+\))?!?: .{1,72}$`
- ไม่ใช้ commitlint/husky ใน MVP (เพิ่ม dependency) ซึ่งทบทวนได้ถ้ามีทีมเพิ่ม
