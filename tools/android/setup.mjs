// Донастраивает Android-проект, который создала команда `npx cap add android` (папка android/ в git не хранится):
//  • альбомная ориентация, полный экран, своя MainActivity (кнопка «Назад» → игра);
//  • версия приложения из package.json (0.86.0 → versionName 0.86.0, versionCode 8600);
//  • подпись релиза, если задан ключ: переменные DL_KEYSTORE (путь к .jks) и DL_STORE_PASS.
// Запуск: node tools/android/setup.mjs  (из корня проекта, после `npx cap add android`)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const APP = path.join(ROOT, 'android/app');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (!fs.existsSync(APP)) { console.error('Нет android/app — сначала npx cap add android'); process.exit(1); }

// замена с проверкой: если шаблон Capacitor поменялся и кусок не нашёлся, сборка падает с понятной ошибкой
function patch(file, re, to, what) {
  const f = path.join(APP, file), s = fs.readFileSync(f, 'utf8');
  if (!re.test(s)) { console.error(`Не нашёл в ${file}: ${what}`); process.exit(1); }
  fs.writeFileSync(f, s.replace(re, to));
}

// 1. ориентация: альбомная, с переворотом по датчику
patch('src/main/AndroidManifest.xml', /<activity(?![^>]*screenOrientation)/, '<activity\n            android:screenOrientation="sensorLandscape"', 'тег <activity>');

// 2. своя MainActivity
const javaDir = path.join(APP, 'src/main/java', ...cfg.appId.split('.'));
fs.mkdirSync(javaDir, {recursive: true});
fs.copyFileSync(path.join(ROOT, 'tools/android/MainActivity.java'), path.join(javaDir, 'MainActivity.java'));

// 3. версия
const [ma, mi, pa] = pkg.version.split('.').map(n => parseInt(n, 10) || 0);
const code = ma * 1000000 + mi * 100 + pa;
patch('build.gradle', /versionCode \d+/, `versionCode ${code}`, 'versionCode');
patch('build.gradle', /versionName "[^"]*"/, `versionName "${pkg.version}"`, 'versionName');

// 4. подпись релиза
const ks = process.env.DL_KEYSTORE, pass = process.env.DL_STORE_PASS;
if (ks && pass) {
  patch('build.gradle', /(\n\s*)buildTypes\s*\{/, `$1signingConfigs {$1    release {$1        storeFile file(System.getenv("DL_KEYSTORE"))$1        storePassword System.getenv("DL_STORE_PASS")$1        keyAlias System.getenv("DL_KEY_ALIAS") ?: "deadline"$1        keyPassword System.getenv("DL_STORE_PASS")$1    }$1}$1buildTypes {`, 'блок buildTypes');
  patch('build.gradle', /(buildTypes\s*\{\s*release\s*\{)/, '$1\n            signingConfig signingConfigs.release', 'buildTypes → release');
  console.log('Подпись релиза: включена');
} else console.log('Ключа нет (DL_KEYSTORE / DL_STORE_PASS): соберётся только отладочный APK');

console.log(`Android-проект готов: ${cfg.appName} ${pkg.version} (versionCode ${code}), ${cfg.appId}`);
