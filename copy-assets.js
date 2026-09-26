import fs from 'fs';
import path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy views into dist
if (fs.existsSync('views')) {
  fs.cpSync('views', path.join('dist', 'views'), { recursive: true });
  console.log('✓ Copied views/ -> dist/views/');
}

// Copy static into dist and public
if (fs.existsSync('static')) {
  fs.cpSync('static', path.join('dist', 'static'), { recursive: true });
  console.log('✓ Copied static/ -> dist/static/');

  // Also ensure public/static exists for Vercel CDN static optimization
  const publicStatic = path.join('public', 'static');
  fs.mkdirSync(publicStatic, { recursive: true });
  fs.cpSync('static', publicStatic, { recursive: true });
  console.log('✓ Copied static/ -> public/static/ (Vercel CDN)');
}
