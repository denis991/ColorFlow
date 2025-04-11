// Utility Functions
function hexToRgb(hex) {
	const normalized = hex.replace(/^#/, '');
	const hasAlpha = normalized.length === 8;
	const [r, g, b, a] = hasAlpha
		? [
				normalized.slice(0, 2),
				normalized.slice(2, 4),
				normalized.slice(4, 6),
				normalized.slice(6, 8),
		]
		: [normalized.slice(0, 2), normalized.slice(2, 4), normalized.slice(4, 6), 'FF'];
	return {
		r: parseInt(r, 16),
		g: parseInt(g, 16),
		b: parseInt(b, 16),
		a: Math.round((parseInt(a, 16) / 255) * 100) / 100,
	};
}

function rgbToHex(r, g, b, a = 1) {
	const toHex = (value) => value.toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(Math.round(a * 255)) : ''}`;
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
	return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
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

// Event Listeners
themeToggle.addEventListener('click', () => {
	app.classList.toggle('dark');
	themeToggle.textContent = app.classList.contains('dark') ? '🌙' : '☀️';
	localStorage.setItem('theme', app.classList.contains('dark') ? 'dark' : 'light');
});

languageSwitcher.addEventListener('change', (e) => {
	const lang = e.target.value;
	document.documentElement.lang = lang;
	localStorage.setItem('language', lang);
});

colorInput.addEventListener('input', (e) => {
	const input = e.target.value.trim();
	try {
		const color = hexToRgb(input.startsWith('#') ? input : rgbToHex(...parseColor(input)));
		updateColor(color);
	} catch (error) {
		alert('Invalid color format');
	}
});

alphaSlider.addEventListener('input', (e) => {
	currentColor.a = parseFloat(e.target.value);
	updateColor(currentColor);
});

// Helper Functions
function parseColor(color) {
	if (color.startsWith('rgb')) {
		return color.match(/\d+/g).map(Number);
	} else if (color.startsWith('#')) {
		return Object.values(hexToRgb(color));
	}
	return [255, 255, 255];
}

function updateColor(color) {
	currentColor = color;
	selectedColor.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
	hexOutput.textContent = rgbToHex(color.r, color.g, color.b, color.a);
	rgbOutput.textContent = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a.toFixed(2)})`;
	const { h, s, l } = rgbToHsl(color.r, color.g, color.b);
	hslOutput.textContent = `hsla(${h}, ${s}%, ${l}%, ${color.a.toFixed(2)})`;
	// CMYK conversion is omitted for brevity
}

function copyToClipboard(id) {
	const text = document.getElementById(id).textContent;
	navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark') {
		app.classList.add('dark');
		themeToggle.textContent = '🌙';
	}

	const savedLanguage = localStorage.getItem('language');
	if (savedLanguage) {
		languageSwitcher.value = savedLanguage;
		document.documentElement.lang = savedLanguage;
	}
});
