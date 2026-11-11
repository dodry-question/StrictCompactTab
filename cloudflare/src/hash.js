// SHA-256 в hex. Общий помощник для Worker: хеш файла расписания и
// проверочное значение ключа записи в облако.
export async function sha256Hex(data) {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
