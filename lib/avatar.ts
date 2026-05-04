export async function imageFileToDataUrl(file: File | null) {
  if (!file || file.size === 0) return "";
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 900 * 1024) throw new Error("Profile picture must be under 900 KB.");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read this profile picture."));
    reader.readAsDataURL(file);
  });
}

export function initials(name: string) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}
