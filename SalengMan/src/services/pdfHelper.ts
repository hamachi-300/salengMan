import { jsPDF } from "jspdf";

/**
 * Saves a jsPDF instance as a file.
 * Handles the difference between standard browser and Tauri (mobile/desktop).
 */
export async function savePdf(doc: jsPDF, fileName: string) {
    // Check if running inside Tauri
    const isTauri = !!(window as any).__TAURI_INTERNALS__;

    if (isTauri) {
        try {
            // Dynamically import Tauri APIs to avoid errors in standard browser
            const { writeFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");

            // Get the PDF as an ArrayBuffer
            const pdfOutput = doc.output("arraybuffer");
            const uint8Array = new Uint8Array(pdfOutput);

            // In Tauri v2, we try to save to the Downloads directory on mobile/desktop
            // This is more reliable for Android than standard blob downloads
            console.log("Attempting to write PDF to Downloads...");
            await writeFile(fileName, uint8Array, {
                baseDir: BaseDirectory.Download,
            });

            console.log(`Successfully saved PDF to Downloads: ${fileName}`);
            alert(`ดาวน์โหลดสำเร็จ: ไฟล์ถูกบันทึกในโฟลเดอร์ Downloads (${fileName})`);
        } catch (error) {
            console.error("Tauri PDF Save Error details:", error);
            // Fallback to standard save if plugin fails
            console.log("Falling back to standard doc.save()...");
            doc.save(fileName);
        }
    } else {
        // Standard browser behavior
        doc.save(fileName);
    }
}
