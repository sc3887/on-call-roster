# Relay — לוח תורנויות

[![CI](https://github.com/sc3887/on-call-roster/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/sc3887/on-call-roster/actions/workflows/ci.yml)

Relay היא מערכת לניהול תורנויות צוות. אפשר לשכפל את המאגר מ-GitHub ללא Docker. להרצה מלאה אפשר להשתמש ב-Docker Compose, או להריץ את הממשק והשרת מקומית עם PostgreSQL שמותקן במחשב.

## תוכן עניינים

- [טכנולוגיות](#טכנולוגיות)
- [חשבונות הדגמה](#חשבונות-הדגמה)
- [הרצה מלאה עם Docker](#הרצה-מלאה-עם-docker)
- [הרצה מקומית לפיתוח](#הרצה-מקומית-לפיתוח)
- [מבנה המערכת](#מבנה-המערכת)
- [ארכיטקטורה](#ארכיטקטורה)
- [API](#api)
- [אבטחה והרשאות](#אבטחה-והרשאות)
- [בדיקות ו-CI](#בדיקות-ו-ci)

## טכנולוגיות

- **ממשק משתמש:** React, TypeScript ו-Vite
- **שרת:** Node.js, Express ו-TypeScript
- **מסד נתונים:** PostgreSQL ו-Prisma
- **אימות:** סיסמאות מוצפנות באמצעות bcrypt, ואסימון JWT בעוגיית HttpOnly
- **בדיקות:** Vitest, Supertest ובדיקות אינטגרציה מול PostgreSQL
- **סביבת הרצה:** Docker Compose ו-Nginx
- **אוטומציה:** GitHub Actions לבדיקות ולבניית הפרויקט

## חשבונות הדגמה

החשבונות הבאים נוצרים בטעינת נתוני ההדגמה. הם מיועדים להרצה מקומית בלבד.

| תפקיד | כתובת דוא"ל | סיסמה |
|---|---|---|
| מנהל | `admin@example.com` | `ChangeMe123!` |
| משתמש | `user@example.com` | `DemoUser123!` |

## הרצה מלאה עם Docker

**דרישות:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) מותקן ופועל. Docker Compose כלול בו.

ב-PowerShell, פתחו חלון בתיקייה שבה תרצו לשמור את הפרויקט והריצו:

```powershell
git clone https://github.com/sc3887/on-call-roster.git
cd on-call-roster
Copy-Item .env.example .env
docker compose up --build
```

ב-macOS או Linux, השתמשו בפקודה `cp .env.example .env` במקום `Copy-Item`.

קובץ `.env.example` כולל ערכים מוכנים להרצה מקומית; אין צורך לערוך אותו. עם עליית המערכת נוצר מסד הנתונים ונטענים נתוני הדגמה, כולל תורנויות עבר, עתיד ותורנות להיום.

- **האפליקציה:** [http://localhost:8080](http://localhost:8080/)
- **בדיקת תקינות:** [http://localhost:8080/health](http://localhost:8080/health)

לעצירה, לחצו `Ctrl+C` ואז הריצו בחלון נוסף, מתוך תיקיית הפרויקט:

```powershell
docker compose down
```

הפקודה עוצרת את השירותים ושומרת את נתוני מסד הנתונים.

## הרצה מקומית לפיתוח

בהרצה זו ממשק המשתמש והשרת פועלים ישירות דרך Node.js. אפשר להריץ את PostgreSQL ב-Docker, או להתקין אותו ישירות במחשב ולהריץ בלי Docker.

**דרישות:** [Node.js 22 ומעלה](https://nodejs.org/) ו-PostgreSQL 16. Docker Desktop נדרש רק אם בוחרים להריץ את PostgreSQL ב-Docker.

### 1. שכפול הפרויקט והכנת מסד הנתונים

בחלון PowerShell, בתיקייה שבה תרצו לשמור את הפרויקט, שכפלו את המאגר והכינו את קובץ הסביבה:

```powershell
git clone https://github.com/sc3887/on-call-roster.git
cd on-call-roster
Copy-Item .env.example .env
```

### 2. בחירת מסד הנתונים

#### אפשרות א׳: PostgreSQL ב-Docker

ודאו ש-Docker Desktop פועל, ואז הריצו:

```powershell
docker compose up -d db
```

#### אפשרות ב׳: PostgreSQL מקומי, ללא Docker

1. אם `winget` מותקן במחשב, פתחו PowerShell והריצו את הפקודה הבאה. אשף ההתקנה ייפתח; השאירו את ברירות המחדל, ובשלב הסיסמה הגדירו סיסמה למשתמש `postgres` וזכרו אותה:

```powershell
winget install --id PostgreSQL.PostgreSQL.16 --exact
```

אם `winget` אינו זמין, התקינו את [PostgreSQL 16 ל-Windows](https://www.postgresql.org/download/windows/) דרך האתר. גם בהתקנה זו הגדירו סיסמה למשתמש `postgres`.

2. פתחו מתפריט Start את **SQL Shell (psql)**. במסך השאלות לחצו Enter כדי לקבל את ברירות המחדל: `localhost`, מסד הנתונים `postgres`, פורט `5432` ומשתמש `postgres`. כשהתוכנה מבקשת סיסמה, הזינו את הסיסמה שהגדרתם בהתקנה. בזמן ההקלדה לא יוצגו תווים על המסך — זה תקין.
3. כשתופיע שורת פקודה שמסתיימת ב-`postgres=#`, העתיקו והדביקו את הפקודה הבאה ולחצו Enter:

```sql
CREATE ROLE roster WITH LOGIN PASSWORD 'roster-local-password';
```

4. העתיקו והדביקו את הפקודה הבאה ולחצו Enter:

```sql
CREATE DATABASE roster OWNER roster;
```

5. אחרי ששתי הפקודות הצליחו, הקלידו `\q` ולחצו Enter כדי לצאת מ-SQL Shell. כעת חזרו ל-PowerShell והמשיכו לסעיף הבא.

הפקודות מיועדות למסד נתונים חדש. אם מתקבלת הודעה שהמשתמש `roster` כבר קיים, הריצו במקום הפקודה הראשונה:

```sql
ALTER ROLE roster WITH LOGIN PASSWORD 'roster-local-password';
```

אם מסד הנתונים `roster` כבר קיים, אל תריצו שוב את `CREATE DATABASE`. בקובץ `.env` פרטי החיבור צריכים להתאים ל-PostgreSQL המקומי: כתובת `localhost`, פורט `5432`, מסד נתונים `roster`, משתמש `roster` וסיסמה `roster-local-password`. סיסמת הדוגמה מיועדת לפיתוח מקומי בלבד.

### 3. התקנת התלויות, יצירת הסכמה ונתוני הדגמה

לאחר שמסד הנתונים פועל, חזרו לתיקיית הפרויקט והריצו:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate:dev
npm.cmd run db:seed
```

הפקודות מתקינות את התלויות, יוצרות את Prisma Client, מפעילות את המיגרציות ומכניסות נתוני הדגמה.

### 4. הפעלת השרת

באותו חלון, מתוך תיקיית `on-call-roster`, הפעילו:

```powershell
npm.cmd run dev --workspace=backend
```

השאירו את החלון פתוח. השרת פועל בפורט `4000`.

### 5. הפעלת הממשק

פתחו חלון PowerShell נוסף מתוך תיקיית `on-call-roster` והפעילו:

```powershell
npm.cmd run dev --workspace=frontend
```

פתחו את [http://localhost:5173](http://localhost:5173/).

ב-PowerShell נעשה שימוש ב-`npm.cmd` כדי להריץ npm ללא שינוי הגדרות האבטחה של Windows. ב-macOS או Linux השתמשו ב-`cp .env.example .env` ובפקודת `npm` במקום `npm.cmd`.

לעצירת השרתים, לחצו `Ctrl+C` בכל אחד מחלונות הפיתוח. אם PostgreSQL פועל ב-Docker, עצרו אותו מתיקיית הפרויקט:

```powershell
docker compose down
```

בהתקנה מקומית של PostgreSQL אפשר לעצור אותו דרך **Services** של Windows או דרך כלי ניהול השירותים של PostgreSQL.

## מבנה המערכת

```text
on-call-roster/
├── .github/workflows/ci.yml   בדיקות ובניית הפרויקט ב-GitHub Actions
├── backend/                   שרת Express, מודלים ובדיקות
│   ├── prisma/                סכמת מסד הנתונים, מיגרציות ונתוני הדגמה
│   │   └── migrations/        היסטוריית שינויים בסכמת מסד הנתונים
│   ├── scripts/               סקריפטים עזר, כולל פקודות Prisma
│   ├── src/
│   │   ├── conf/              טעינת הגדרות וחיבור למסד הנתונים
│   │   ├── controllers/       טיפול בבקשות ובתגובות HTTP
│   │   ├── lib/               ולידציה, תאריכים ולוגיקה משותפת
│   │   ├── middleware/        אימות, הרשאות וטיפול בשגיאות
│   │   ├── models/            שאילתות וגישה לנתונים
│   │   ├── routes/            הגדרת נתיבי ה-API
│   │   └── types/             טיפוסים משותפים בשרת
│   └── test/                  בדיקות יחידה, API ואינטגרציה
├── frontend/                  ממשק React
│   ├── public/                קבצים סטטיים
│   │   └── images/            תמונות ונכסים סטטיים
│   ├── src/
│   │   ├── components/
│   │   │   ├── accessibility/ רכיבי נגישות
│   │   │   ├── admin/         מסך ניהול
│   │   │   ├── auth/          התחברות
│   │   │   ├── common/        רכיבים משותפים
│   │   │   ├── roster/        לוח תורנויות וטפסי תורנות
│   │   │   └── support/       תמיכה
│   │   ├── services/          תקשורת עם ה-API
│   │   ├── store/             ניהול מצב האפליקציה
│   │   ├── types/             טיפוסי TypeScript
│   │   └── utils/             תרגומים וכלי עזר
│   └── test/                  בדיקות שירות API וניהול מצב
├── docker-compose.yml         שירותי מסד נתונים, שרת וממשק
├── package.json               הגדרות וסקריפטים משותפים
└── .env.example               ערכי סביבה לדוגמה
```

## ארכיטקטורה

- **ממשק:** React ו-TypeScript, תמיכה בעברית ובאנגלית, כולל תצוגת RTL. חיפוש התורנויות משתמש בהשהיה קצרה כדי לצמצם בקשות, ותשובות ישנות אינן מחליפות תוצאות חדשות.
- **שרת:** Express מחולק לנתיבים, בקרים, מודלים ותשתיות. אימות הרשאות נעשה בשרת, ובדיקת הנתונים מתבצעת לפני גישה למסד.
- **מסד נתונים:** Prisma מנהל את סכמת PostgreSQL ואת המיגרציות. חבר צוות יכול להיות מקושר לחשבון משתמש; לחבר צוות אחד יכולות להיות תורנויות רבות.
- **תורנויות:** אילוץ ייחודיות במסד מונע שתי תורנויות לאותו חבר צוות באותו תאריך. נתוני ההדגמה נטענים באופן חוזר ובטוח, ותורנות היום מחושבת לפי אזור הזמן העסקי.
- **תמיכה:** פניות תמיכה שייכות למשתמש וכוללות הודעות המשויכות לפנייה.

## API

בדיקת תקינות זמינה ב-`/health` וב-`/api/health`. יתר הנתיבים, למעט התחברות, דורשים משתמש מחובר.

| פעולה | נתיב | הרשאה ותיאור |
|---|---|---|
| `POST` | `/api/auth/login` | התחברות |
| `POST` | `/api/auth/logout` | יציאה |
| `GET` | `/api/auth/me` | פרטי המשתמש המחובר |
| `GET` | `/api/members?page=1&limit=8` | חברי צוות בדפדוף; מחזיר גם פרטי עמוד וחבר הצוות המקושר למשתמש |
| `GET` | `/api/shifts/today` | תורנויות היום |
| `GET` | `/api/shifts` | חיפוש תורנויות ודפדוף בין עמודים |
| `POST` | `/api/shifts` | יצירת תורנות לפי הרשאות המשתמש |
| `PUT` | `/api/shifts/:id` | עריכת תורנות; לא ניתן לשנות תאריך לתאריך עבר |
| `DELETE` | `/api/shifts/:id` | מחיקת תורנות |
| `GET/POST/PATCH` | `/api/support/*` | צפייה וניהול של פניות תמיכה |

## אבטחה והרשאות

- סיסמאות נשמרות במסד כ-hash של bcrypt.
- אסימון ההתחברות נשמר בעוגיית HttpOnly עם `SameSite=Strict`.
- משתמש רגיל יכול לנהל רק את התורנויות שלו; מנהל יכול לנהל תורנויות של כל הצוות.
- תורנות מתאריך עבר ניתנת למחיקה, אך לא לעריכה.
- הגבלת קצב חלה על ניסיונות התחברות.
- התנגשות בין עדכונים וכפילויות מטופלות עם תגובת HTTP `409`.
- הערכים שב-`.env.example` מיועדים לפיתוח ולהדגמה בלבד, לא לפריסה ציבורית.

## בדיקות ו-CI

להרצת בדיקות ובדיקות איכות מתוך תיקיית הפרויקט:

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

בדיקות האינטגרציה מול PostgreSQL דורשות מסד נתונים פעיל:

```powershell
docker compose up -d db
npm.cmd run db:migrate
$env:RUN_DB_INTEGRATION_TESTS="true"
npm.cmd run test --workspace=backend
```

ב-GitHub Actions פועל תהליך **CI** בכל שינוי שנשלח למאגר ובכל בקשת מיזוג. הוא מפעיל PostgreSQL זמני, מיגרציות, בדיקות, בדיקות קוד ובניית Docker.

**אין בפרויקט CD:** התהליך בודק ובונה את הפרויקט, אך אינו מפרסם תמונות ל-registry ואינו פורס את האפליקציה לסביבת ענן.
