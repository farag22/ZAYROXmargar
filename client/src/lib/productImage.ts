export type CompressedProductImage = {
  dataUrl: string;
  contentType: "image/webp";
  previewUrl: string;
  originalName: string;
};

export function isSupportedProductImage(file: Pick<File, "type" | "size">) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("IMAGE_READ_FAILED"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function compressProductImage(file: File): Promise<CompressedProductImage> {
  if (!isSupportedProductImage(file)) throw new Error("INVALID_PRODUCT_IMAGE");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const source = new Image();
      source.onload = () => resolve(source);
      source.onerror = () => reject(new Error("INVALID_PRODUCT_IMAGE"));
      source.src = objectUrl;
    });
    const limit = 1280;
    const ratio = Math.min(1, limit / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("IMAGE_PROCESSING_FAILED");
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("IMAGE_PROCESSING_FAILED")), "image/webp", 0.82));
    if (blob.size > 2 * 1024 * 1024) throw new Error("INVALID_PRODUCT_IMAGE_SIZE");
    const dataUrl = await readBlobAsDataUrl(blob);
    return { dataUrl, contentType: "image/webp", previewUrl: dataUrl, originalName: file.name };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
