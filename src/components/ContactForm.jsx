import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// ---- Phone mask logic: +380 XX XXX XX XX ----

/** Extract raw digits from any input string, normalizing various UA formats */
function extractDigits(raw) {
  // Strip everything except digits and leading +
  let s = raw.replace(/[^\d+]/g, '');

  // Handle common Ukrainian formats:
  // +380XXXXXXXXX → 380XXXXXXXXX
  // 380XXXXXXXXX  → 380XXXXXXXXX
  // 80XXXXXXXXX   → 380XXXXXXXXX
  // 0XXXXXXXXX    → 380XXXXXXXXX
  if (s.startsWith('+')) s = s.slice(1);

  if (s.startsWith('380')) {
    // already correct
  } else if (s.startsWith('80') && s.length >= 11) {
    s = '3' + s;
  } else if (s.startsWith('0') && s.length >= 10) {
    s = '38' + s;
  }

  // Only keep digits
  return s.replace(/\D/g, '');
}

/** Format digits into +380 XX XXX XX XX */
function formatPhone(digits) {
  // Limit to 12 digits (380 + 9 digits)
  const d = digits.slice(0, 12);
  let result = '+';

  if (d.length === 0) return '';

  // Country code: 380
  result += d.slice(0, 3);
  if (d.length <= 3) return result;

  // Operator: XX
  result += ' ' + d.slice(3, 5);
  if (d.length <= 5) return result;

  // First group: XXX
  result += ' ' + d.slice(5, 8);
  if (d.length <= 8) return result;

  // Second group: XX
  result += ' ' + d.slice(8, 10);
  if (d.length <= 10) return result;

  // Third group: XX
  result += ' ' + d.slice(10, 12);

  return result;
}

/** Get raw +380XXXXXXXXX for API submission */
function getRawPhone(digits) {
  return digits.length > 0 ? '+' + digits.slice(0, 12) : '';
}

// ---- Component ----

export default function ContactForm({ onSubmit, onBack }) {
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const phoneRef = useRef(null);

  const handlePhoneChange = useCallback((e) => {
    const input = e.target.value;
    const newDigits = extractDigits(input);

    // If user clears the field completely
    if (input === '' || input === '+') {
      setPhoneDigits('');
      return;
    }

    setPhoneDigits(newDigits);
  }, []);

  // Handle paste from clipboard or iOS/Android keyboard suggestion
  const handlePhonePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const digits = extractDigits(pasted);
    if (digits.length >= 10) {
      setPhoneDigits(digits);
    }
  }, []);

  // Start with +380 when user focuses empty field
  const handlePhoneFocus = useCallback(() => {
    if (phoneDigits.length === 0) {
      setPhoneDigits('380');
    }
  }, [phoneDigits]);

  const validate = () => {
    const e = {};
    if (!name.trim() || !/^[\p{L}\s-]+$/u.test(name.trim())) {
      e.name = "Введіть коректне ім'я";
    }
    // Must be exactly 12 digits: 380 + 9 digits
    if (phoneDigits.length !== 12) {
      e.phone = 'Введіть повний номер (9 цифр після +380)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const rawPhone = getRawPhone(phoneDigits);

    // Submit to Google Sheets API (fire-and-forget, don't block the game)
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: rawPhone }),
      });
    } catch (err) {
      console.warn('Failed to save to Google Sheets:', err.message);
    }

    setSubmitting(false);
    onSubmit(name.trim());
  };

  const displayPhone = formatPhone(phoneDigits);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 min-h-[70dvh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Майже готово!
          </h2>
          <p className="text-slate-400 text-sm">
            Залиш контакти, щоб побачити результати та потрапити в рейтинг
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Ім'я
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Олександр"
              autoComplete="given-name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Телефон
            </label>
            <input
              ref={phoneRef}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={displayPhone}
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
              onFocus={handlePhoneFocus}
              placeholder="+380 XX XXX XX XX"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors tracking-wide"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-indigo-500/25 cursor-pointer mt-2 disabled:opacity-50"
          >
            {submitting ? 'Зачекайте...' : 'Показати результати'}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Назад до портфеля
          </button>
        </form>
      </motion.div>
    </div>
  );
}
