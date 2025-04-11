// Utility Functions
function hexToRgb(hex) {
	const normalized = hex.replace(/^#/, '');
	const len = normalized.length;
	let r, g, b, a;

	if (len === 3 || len === 4) {
		// Short format: #FFF or #FFFA
		r = normalized[0] + normalized[0];
		g = normalized[1] + normalized[1];
		b = normalized[2] + normalized[2];
		a = len === 4 ? normalized[3] + normalized[3] : 'FF';
	} else if (len === 6 || len === 8) {
		// Full format: #FFFFFF or #FFFFFFAA
		r = normalized.slice(0, 2);
		g = normalized.slice(2, 4);
		b = normalized.slice(4, 6);
		a = len === 8 ? normalized.slice(6, 8) : 'FF';
	} else {
		throw new Error('Invalid HEX format');
	}

	return {
		r: parseInt(r, 16),
		g: parseInt(g, 16),
		b: parseInt(b, 16),
		a: Math.round((parseInt(a, 16) / 255) * 100) / 100,
	};
}

function rgbToHex(r, g, b, a = 1) {
	const toHex = (value) =>
		Math.max(0, Math.min(255, Math.round(value)))
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a * 255) : ''}`;
}

function rgbToHsl(r, g, b) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s = 0,
		l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

function hslToRgb(h, s, l) {
	h /= 360;
	s /= 100;
	l /= 100;

	let r, g, b;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
	};
}

function rgbToCmyk(r, g, b) {
	r /= 255;
	g /= 255;
	b /= 255;

	const k = 1 - Math.max(r, g, b);
	if (k === 1) {
		return { c: 0, m: 0, y: 0, k: 100 };
	}

	const c = (1 - r - k) / (1 - k);
	const m = (1 - g - k) / (1 - k);
	const y = (1 - b - k) / (1 - k);

	return {
		c: Math.round(c * 100),
		m: Math.round(m * 100),
		y: Math.round(y * 100),
		k: Math.round(k * 100),
	};
}

function cmykToRgb(c, m, y, k) {
	c /= 100;
	m /= 100;
	y /= 100;
	k /= 100;

	const r = 255 * (1 - c) * (1 - k);
	const g = 255 * (1 - m) * (1 - k);
	const b = 255 * (1 - y) * (1 - k);

	return {
		r: Math.round(r),
		g: Math.round(g),
		b: Math.round(b),
	};
}

// DOM Elements
const app = document.getElementById('app');
const themeToggle = document.getElementById('theme-toggle');
const languageSwitcher = document.getElementById('language-switcher');
const colorInput = document.getElementById('color-input');
const palette = document.getElementById('palette');
const alphaSlider = document.getElementById('alpha');
const selectedColor = document.getElementById('selected-color');
const hexOutput = document.getElementById('hex-output');
const rgbOutput = document.getElementById('rgb-output');
const hslOutput = document.getElementById('hsl-output');
const cmykOutput = document.getElementById('cmyk-output');

// State
let currentColor = { r: 255, g: 255, b: 255, a: 1 };
let currentHsl = { h: 0, s: 0, l: 100 };

// Localization Keys
const translations = {
	en: {
		title: 'ColorFlow',
		placeholder: "Enter color (e.g., #FF0000 or 'red')",
		alphaLabel: 'Alpha:',
		copy: 'Copy',
		update: 'Update',
		convertedColors: 'Converted Colors',
		invalidColor: 'Invalid color format',
		copied: 'Copied to clipboard!',
	},
	ru: {
		title: 'Цветовой поток',
		placeholder: "Введите цвет (например, #FF0000 или 'красный')",
		alphaLabel: 'Прозрачность:',
		copy: 'Копировать',
		update: 'Обновить',
		convertedColors: 'Преобразованные цвета',
		invalidColor: 'Неверный формат цвета',
		copied: 'Скопировано в буфер обмена!',
	},
};

// Utility: Debounce function
function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

// Parse color input (supports HEX, RGB, HSL, CSS names)
function parseColor(color) {
	color = color.trim().toLowerCase();

	// CSS color names
	const cssColors = {
		red: '#ff0000',
		green: '#008000',
		blue: '#0000ff',
		white: '#ffffff',
		black: '#000000',
		rebeccapurple: '#663399',
		// Add more as needed
	};

	if (cssColors[color]) {
		return Object.values(hexToRgb(cssColors[color]));
	}

	if (color.startsWith('#')) {
		return Object.values(hexToRgb(color));
	}

	if (color.startsWith('rgb')) {
		const matches = color.match(/\d+(\.\d+)?/g);
		if (!matches || matches.length < 3) throw new Error('Invalid RGB format');
		const [r, g, b, a = 1] = matches.map(Number);
		return [r, g, b, a];
	}

	if (color.startsWith('hsl')) {
		const matches = color.match(/\d+(\.\d+)?/g);
		if (!matches || matches.length < 3) throw new Error('Invalid HSL format');
		const [h, s, l, a = 1] = matches.map(Number);
		const rgb = hslToRgb(h, s, l);
		return [rgb.r, rgb.g, rgb.b, a];
	}

	if (color.startsWith('cmyk')) {
		const matches = color.match(/\d+(\.\d+)?/g);
		if (!matches || matches.length !== 4) throw new Error('Invalid CMYK format');
		const [c, m, y, k] = matches.map(Number);
		const rgb = cmykToRgb(c, m, y, k);
		return [rgb.r, rgb.g, rgb.b, 1];
	}

	throw new Error('Invalid color format');
}

// Update UI with current color
function updateColor(color) {
	currentColor = { ...color, a: color.a ?? currentColor.a };
	selectedColor.style.backgroundColor = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a})`;

	// Update outputs
	hexOutput.value = rgbToHex(currentColor.r, currentColor.g, currentColor.b, currentColor.a);
	rgbOutput.value = `rgba(${currentColor.r}, ${currentColor.g}, ${
		currentColor.b
	}, ${currentColor.a.toFixed(2)})`;
	const { h, s, l } = rgbToHsl(currentColor.r, currentColor.g, currentColor.b);
	currentHsl = { h, s, l };
	hslOutput.value = `hsla(${h}, ${s}%, ${l}%, ${currentColor.a.toFixed(2)})`;
	const { c, m, y, k } = rgbToCmyk(currentColor.r, currentColor.g, currentColor.b);
	cmykOutput.value = `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

// Update text based on language
function updateText(lang) {
	document.querySelectorAll('[data-i18n]').forEach((elem) => {
		const key = elem.getAttribute('data-i18n');
		if (translations[lang][key]) {
			elem.textContent = translations[lang][key];
		}
	});

	document.querySelectorAll('[data-i18n-placeholder]').forEach((elem) => {
		const key = elem.getAttribute('data-i18n-placeholder');
		if (translations[lang][key]) {
			elem.placeholder = translations[lang][key];
		}
	});
}

// Copy to clipboard
function copyToClipboard(id) {
	const text = document.getElementById(id).value;
	navigator.clipboard.writeText(text).then(() => {
		const lang = languageSwitcher.value;
		alert(translations[lang].copied);
	});
}

// Initialize color palette on canvas
function initPalette() {
	const ctx = palette.getContext('2d');
	palette.width = palette.clientWidth;
	palette.height = palette.clientHeight;

	// Draw HSL gradient (Hue on X, Saturation on Y)
	for (let x = 0; x < palette.width; x++) {
		for (let y = 0; y < palette.height; y++) {
			const h = (x / palette.width) * 360;
			const s = (1 - y / palette.height) * 100;
			const l = 50; // Fixed lightness for better visibility
			ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
			ctx.fillRect(x, y, 1, 1);
		}
	}

	// Draw cursor
	drawCursor();
}

function drawCursor() {
	const ctx = palette.getContext('2d');
	const x = (currentHsl.h / 360) * palette.width;
	const y = (1 - currentHsl.s / 100) * palette.height;

	// Clear previous cursor
	ctx.clearRect(x - 10, y - 10, 20, 20);

	// Draw new cursor
	ctx.beginPath();
	ctx.arc(x, y, 8, 0, Math.PI * 2);
	ctx.strokeStyle = currentHsl.l > 50 ? '#000' : '#fff';
	ctx.lineWidth = 2;
	ctx.stroke();
}

// Handle palette click
palette.addEventListener('click', (e) => {
	const rect = palette.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	const h = (x / palette.width) * 360;
	const s = (1 - y / palette.height) * 100;
	const l = currentHsl.l; // Keep current lightness
	currentHsl = { h, s, l };

	const rgb = hslToRgb(h, s, l);
	updateColor({ r: rgb.r, g: rgb.g, b: rgb.b, a: currentColor.a });
	drawCursor();
});

// Handle keyboard navigation on palette
palette.addEventListener('keydown', (e) => {
	let { h, s, l } = currentHsl;
	const step = 5;

	switch (e.key) {
		case 'ArrowLeft':
			h = Math.max(0, h - step);
			break;
		case 'ArrowRight':
			h = Math.min(360, h + step);
			break;
		case 'ArrowUp':
			s = Math.min(100, s + step);
			break;
		case 'ArrowDown':
			s = Math.max(0, s - step);
			break;
		default:
			return;
	}

	currentHsl = { h, s, l };
	const rgb = hslToRgb(h, s, l);
	updateColor({ r: rgb.r, g: rgb.g, b: rgb.b, a: currentColor.a });
	drawCursor();
});

// Theme toggle
themeToggle.addEventListener('click', () => {
	document.body.classList.toggle('dark');
	themeToggle.textContent = document.body.classList.contains('dark') ? '🌙' : '☀️';
	localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Language switcher
languageSwitcher.addEventListener('change', (e) => {
	const lang = e.target.value;
	document.documentElement.lang = lang;
	localStorage.setItem('language', lang);
	updateText(lang);
});

// Color input with debouncing
const debouncedUpdate = debounce((input) => {
	try {
		const [r, g, b, a = 1] = parseColor(input);
		updateColor({ r, g, b, a });
	} catch (error) {
		const lang = languageSwitcher.value;
		alert(translations[lang].invalidColor);
	}
}, 300);

colorInput.addEventListener('input', (e) => {
	debouncedUpdate(e.target.value.trim());
});

// Alpha slider
alphaSlider.addEventListener('input', (e) => {
	currentColor.a = parseFloat(e.target.value);
	updateColor(currentColor);
});

// Update from input
function updateFromInput(format) {
	try {
		let newColor;
		switch (format) {
			case 'hex':
				newColor = hexToRgb(document.getElementById('hex-output').value);
				break;
			case 'rgb':
				newColor = parseColor(document.getElementById('rgb-output').value);
				newColor = { r: newColor[0], g: newColor[1], b: newColor[2], a: newColor[3] };
				break;
			case 'hsl':
				const hsl = document
					.getElementById('hsl-output')
					.value.match(/\d+(\.\d+)?/g)
					.map(Number);
				const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
				newColor = { r: rgb.r, g: rgb.g, b: rgb.b, a: hsl[3] || 1 };
				break;
			case 'cmyk':
				const cmyk = document
					.getElementById('cmyk-output')
					.value.match(/\d+(\.\d+)?/g)
					.map(Number);
				const rgbCmyk = cmykToRgb(cmyk[0], cmyk[1], cmyk[2], cmyk[3]);
				newColor = { r: rgbCmyk.r, g: rgbCmyk.g, b: rgbCmyk.b, a: 1 };
				break;
		}
		updateColor(newColor);
	} catch (error) {
		const lang = languageSwitcher.value;
		alert(translations[lang].invalidColor);
	}
}

// Copy buttons
document.querySelectorAll('.copy-btn').forEach((btn) => {
	btn.addEventListener('click', () => {
		const format = btn.getAttribute('data-format');
		copyToClipboard(format);
	});
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
	// Theme
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark') {
		document.body.classList.add('dark');
		themeToggle.textContent = '🌙';
	} else {
		themeToggle.textContent = '☀️';
	}

	// Language
	const savedLanguage = localStorage.getItem('language') || 'en';
	languageSwitcher.value = savedLanguage;
	document.documentElement.lang = savedLanguage;
	updateText(savedLanguage);

	// Initialize palette
	initPalette();

	// Initial color update
	updateColor(currentColor);
});
