const $ = (selector) => document.querySelector(selector);
const qrForm = $('#qr-form');
const qrResult = $('#qr-result');
const qrBox = $('#qrcode');
let selectedPhotos = [];

qrForm.addEventListener('submit', (event) => {
  event.preventDefault();
  let link = $('#link-input').value.trim();
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;
  try { new URL(link); } catch { $('#link-input').setCustomValidity('Please enter a valid link.'); $('#link-input').reportValidity(); return; }
  $('#link-input').setCustomValidity('');
  qrBox.replaceChildren();
  new QRCode(qrBox, { text: link, width: 180, height: 180, colorDark: '#17231e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  qrResult.hidden = false;
});

$('#download-qr').addEventListener('click', () => {
  const image = qrBox.querySelector('img') || qrBox.querySelector('canvas');
  if (!image) return;
  const download = document.createElement('a');
  download.download = 'snaplink-qr.png';
  download.href = image.tagName === 'CANVAS' ? image.toDataURL('image/png') : image.src;
  download.click();
});

const modal = $('#camera-modal');
const openPicker = () => $('#photo-input').click();
$('#select-photos').addEventListener('click', () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); });
$('#close-modal').addEventListener('click', () => modal.classList.remove('open'));
$('#continue-gallery').addEventListener('click', () => { modal.classList.remove('open'); openPicker(); });
$('#allow-camera').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch (error) { console.info('Camera permission was not granted.', error); }
  modal.classList.remove('open'); openPicker();
});
modal.addEventListener('click', (event) => { if (event.target === modal) modal.classList.remove('open'); });

$('#photo-input').addEventListener('change', (event) => {
  selectedPhotos = Array.from(event.target.files).filter((file) => file.type.startsWith('image/'));
  renderPreviews();
});
$('#clear-photos').addEventListener('click', () => { selectedPhotos = []; $('#photo-input').value = ''; renderPreviews(); });
function renderPreviews() {
  const preview = $('#photo-preview'); const drop = $('#photo-drop-zone'); const list = $('#preview-list');
  preview.hidden = selectedPhotos.length === 0; drop.hidden = selectedPhotos.length > 0;
  $('#photo-count').textContent = `${selectedPhotos.length} photo${selectedPhotos.length === 1 ? '' : 's'} selected`;
  list.replaceChildren();
  selectedPhotos.forEach((file, index) => { const item = document.createElement('div'); item.className = 'preview-item'; const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.alt = `Selected photo ${index + 1}`; const num = document.createElement('span'); num.textContent = index + 1; item.append(img, num); list.append(item); });
}

$('#make-pdf').addEventListener('click', async () => {
  if (!selectedPhotos.length) return;
  const button = $('#make-pdf'); button.disabled = true; button.textContent = 'Creating PDF…';
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  for (let i = 0; i < selectedPhotos.length; i++) {
    if (i) pdf.addPage();
    const data = await readFile(selectedPhotos[i]); const image = await loadImage(data);
    const pageW = 210, pageH = 297, margin = 10; const ratio = Math.min((pageW - margin * 2) / image.width, (pageH - margin * 2) / image.height);
    const width = image.width * ratio, height = image.height * ratio;
    pdf.addImage(data, selectedPhotos[i].type === 'image/png' ? 'PNG' : 'JPEG', (pageW - width) / 2, (pageH - height) / 2, width, height);
  }
  pdf.save('my-photos.pdf'); button.disabled = false; button.innerHTML = 'Create PDF <span>→</span>';
});
function readFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
