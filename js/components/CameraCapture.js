/**
 * js/components/CameraCapture.js
 * Manages native camera uploads, image compression via Canvas, and base64 mapping.
 */

export class CameraCapture {
  /**
   * @param {string} containerId - Element ID of the mounting div.
   * @param {Object} formState - The global form data.
   * @param {string} dataPath - Object path inside formState (e.g. "photos.photoExteriorBase64").
   * @param {string} label - Display label.
   */
  constructor(containerId, formState, dataPath, label) {
    this.container = document.getElementById(containerId);
    this.formState = formState;
    this.dataPath = dataPath;
    this.label = label;
  }

  /**
   * Initializes and renders components.
   */
  init() {
    this.render();
  }

  /**
   * Renders preview block, file picker, and deletion button.
   */
  render() {
    if (!this.container) return;
    const value = this.getValue();
    const uniqueId = `cam-${this.dataPath.replace(/\./g, '-')}`;

    this.container.innerHTML = `
      <div class="camera-capture-card card" style="padding: 1.25rem; border: 1.5px dashed var(--border-color); text-align: center; background-color: var(--bg-primary);">
        <span style="font-weight: 600; display: block; margin-bottom: 0.75rem; color: var(--primary-dark); font-size: 0.95rem;">
          ${this.label}
        </span>
        
        <div class="camera-preview-container" style="margin-bottom: 1rem; min-height: 140px; display: flex; align-items: center; justify-content: center; background-color: #f1f5f9; border-radius: var(--border-radius); overflow: hidden; border: 1px solid var(--border-color);">
          ${value ? `
            <img src="${value}" style="max-width: 100%; max-height: 180px; object-fit: contain;" alt="Home visit photo">
          ` : `
            <span style="color: var(--text-muted); font-size: 0.85rem;">ยังไม่มีรูปถ่ายแนบ</span>
          `}
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: center;">
          <label class="button-primary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; padding: 0.5rem 1rem;">
            📸 ${value ? 'ถ่ายใหม่' : 'ถ่ายภาพ'}
            <input type="file" id="${uniqueId}" accept="image/*" capture="environment" style="display: none;">
          </label>
          ${value ? `
            <button type="button" class="button-secondary" id="${uniqueId}-delete" style="color: #ef4444; border-color: #fca5a5; font-size: 0.85rem; padding: 0.5rem 1rem;">
              🗑️ ลบรูป
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Bind Events
    const fileInput = document.getElementById(uniqueId);
    fileInput.addEventListener("change", (e) => this.handleFileSelected(e));

    if (value) {
      document.getElementById(`${uniqueId}-delete`).addEventListener("click", () => this.handleDelete());
    }
  }

  /**
   * Resolves value by deep path mapping.
   */
  getValue() {
    const parts = this.dataPath.split('.');
    return parts.reduce((obj, part) => obj && obj[part], this.formState);
  }

  /**
   * Sets value by deep path mapping.
   */
  setValue(val) {
    const parts = this.dataPath.split('.');
    let current = this.formState;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = val;

    // Broadcast state update event
    window.dispatchEvent(new CustomEvent('form-state-changed', { detail: this.formState }));
  }

  /**
   * Handles deletion of selected photo.
   */
  handleDelete() {
    if (confirm(`ต้องการลบ ${this.label} หรือไม่?`)) {
      this.setValue("");
      this.render();
    }
  }

  /**
   * Handles native camera file capture.
   */
  async handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loader = document.getElementById("global-loader");
    if (loader) {
      document.getElementById("loader-text").textContent = "กำลังบีบอัดรูปภาพ...";
      loader.classList.remove("hidden");
    }

    try {
      const compressedBase64 = await this.compressImage(file);
      this.setValue(compressedBase64);
      if (loader) loader.classList.add("hidden");
      this.render();
    } catch (error) {
      if (loader) loader.classList.add("hidden");
      alert("ไม่สามารถประมวลผลรูปถ่ายได้: " + error.message);
    }
  }

  /**
   * Compresses image via HTML5 Canvas.
   * Resizes image to maximum 800x600 and exports as JPEG with 0.7 quality to conserve space.
   */
  compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = image.width;
          let height = image.height;

          // Scale maintaining aspect ratios
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(image, 0, 0, width, height);

          // Export compressed JPEG base64 DataURL
          const base64Data = canvas.toDataURL("image/jpeg", 0.7);
          resolve(base64Data);
        };
        image.onerror = () => reject(new Error("Failed to load image resource."));
        image.src = event.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read file stream."));
      reader.readAsDataURL(file);
    });
  }
}
