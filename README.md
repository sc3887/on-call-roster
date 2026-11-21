# Relay — לוח תורנויות

[![CI](https://github.com/sc3887/on-call-roster/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/sc3887/on-call-roster/actions/workflows/ci.yml)

Relay היא מערכת לניהול תורנויות צוות. היא כוללת ממשק משתמש, שרת API ומסד נתונים, וניתנת להפעלה מלאה באמצעות Docker Compose או להרצה מקומית לצורכי פיתוח.

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

בהרצה זו ממשק המשתמש והשרת פועלים ישירות דרך Node.js. PostgreSQL פועל ב-Docker.

**דרישות:** [Node.js 22 ומעלה](https://nodejs.org/) ו-[Docker Desktop](https://www.docker.com/products/docker-desktop/).

### 1. שכפול הפרויקט והכנת מסד הנתונים

בחלון PowerShell, בתיקייה שבה תרצו לשמור את הפרויקט, הריצו:

```powershell
git clone https://github.com/sc3887/on-call-roster.git
cd on-call-roster
Copy-Item .env.example .env
docker compose up -d db
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate:dev
npm.cmd run db:seed
```

הפקודות מתקינות את התלויות, יוצרות את טבלאות מסד הנתונים ומכניסות נתוני הדגמה.

### 2. הפעלת השרת

באותו חלון, מתוך תיקיית `on-call-roster`, הפעילו:

```powershell
npm.cmd run dev --workspace=backend
```

השאירו את החלון פתוח. השרת פועל בפורט `4000`.

### 3. הפעלת הממשק

פתחו חלון PowerShell נוסף מתוך תיקיית `on-call-roster` והפעילו:

```powershell
npm.cmd run dev --workspace=frontend
```

פתחו את [http://localhost:5173](http://localhost:5173/).

ב-PowerShell נעשה שימוש ב-`npm.cmd` כדי להריץ npm ללא שינוי הגדרות האבטחה של Windows. ב-macOS או Linux השתמשו ב-`cp .env.example .env` ובפקודת `npm` במקום `npm.cmd`.

לעצירת השרתים, לחצו `Ctrl+C` בכל אחד מחלונות הפיתוח. לעצירת מסד הנתונים, הריצו מתיקיית הפרויקט:

```powershell
docker compose down
```

## מבנה המערכת

```text
on-call-roster/
├── .github/workflows/ci.yml   בדיקות ובניית הפרויקט ב-GitHub Actions
├── backend/                   שרת Express, מודלים ובדיקות
│   ├── prisma/                סכמת מסד הנתונים, מיגרציות ונתוני הדגמה
│   └── src/                   נתיבים, בקרים, מודלים ותשתיות
├── frontend/                  ממשק React
│   ├── public/                קבצים סטטיים
│   ├── src/                   רכיבי הממשק, שירותים וניהול מצב
│   └── test/                  בדיקות יחידה לשירותים ולניהול המצב
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
