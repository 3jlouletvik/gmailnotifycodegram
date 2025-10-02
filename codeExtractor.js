function extractVerificationCode(message) {
  try {
    const headers = message.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';

    // Извлекаем текст письма
    let emailText = '';

    function extractTextFromPart(part) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
      if (part.mimeType === 'text/html' && part.body.data && !emailText) {
        // Убираем HTML теги
        const html = Buffer.from(part.body.data, 'base64').toString();
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      }
      return '';
    }

    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        emailText += extractTextFromPart(part);
        if (part.parts) {
          for (const subPart of part.parts) {
            emailText += extractTextFromPart(subPart);
          }
        }
      }
    } else if (message.payload.body.data) {
      emailText = Buffer.from(message.payload.body.data, 'base64').toString();
    }

    // Регулярные выражения для поиска кодов
    const codePatterns = [
      /\b(\d{4,8})\b/g,  // 4-8 цифр
      /code[:\s]+([A-Z0-9]{4,8})/gi,  // "code: ABC123"
      /verification[:\s]+([A-Z0-9]{4,8})/gi,  // "verification: 123456"
      /confirm[:\s]+([A-Z0-9]{4,8})/gi,  // "confirm: 123456"
      /подтверждения[:\s]+(\d{4,8})/gi,  // Русский текст
      /код[:\s]+(\d{4,8})/gi,  // Русский текст
      /OTP[:\s]+([A-Z0-9]{4,8})/gi,  // OTP codes
      /pin[:\s]+(\d{4,8})/gi,  // PIN codes
      /token[:\s]+([A-Z0-9]{4,8})/gi  // Token codes
    ];

    const codes = new Set();

    for (const pattern of codePatterns) {
      const matches = emailText.matchAll(pattern);
      for (const match of matches) {
        codes.add(match[1]);
      }
    }

    // Фильтруем слишком простые коды (например, 1111, 0000)
    const filteredCodes = Array.from(codes).filter(code => {
      const uniqueChars = new Set(code.split('')).size;
      return uniqueChars > 1; // Должно быть больше одной уникальной цифры
    });

    return {
      codes: filteredCodes,
      subject,
      from,
      snippet: message.snippet
    };
  } catch (error) {
    console.error('❌ Ошибка извлечения кода:', error.message);
    return {
      codes: [],
      subject: '',
      from: '',
      snippet: ''
    };
  }
}

module.exports = { extractVerificationCode };
