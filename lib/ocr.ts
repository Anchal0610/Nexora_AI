import fs from 'fs';
import zlib from 'zlib';
// @ts-expect-error pdf-parse does not have types
import pdf from 'pdf-parse';

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractZipEntry(buffer: Buffer, targetNames: RegExp): string[] {
  const results: string[] = [];
  // Find End of Central Directory (EOCD) signature: 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= minOffset; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid DOCX/PPTX archive (missing central directory).');
  }

  const centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  let ptr = centralDirOffset;
  const end = centralDirOffset + centralDirSize;

  while (ptr < end && ptr + 46 <= buffer.length) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) break;

    const compressionMethod = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const fileNameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42);

    const fileName = buffer.toString('utf8', ptr + 46, ptr + 46 + fileNameLen);
    ptr += 46 + fileNameLen + extraLen + commentLen;

    if (!targetNames.test(fileName)) continue;
    if (localHeaderOffset + 30 > buffer.length) continue;
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;

    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) continue;

    const rawSlice = buffer.subarray(dataStart, dataEnd);
    let contentBuf: Buffer;
    if (compressionMethod === 0) {
      contentBuf = rawSlice;
    } else if (compressionMethod === 8) {
      contentBuf = zlib.inflateRawSync(rawSlice);
    } else {
      continue;
    }
    results.push(contentBuf.toString('utf8'));
  }

  return results;
}

function xmlToPlainText(xml: string): string {
  const withBreaks = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<w:cr[^>]*\/>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, ' ')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<a:br[^>]*\/>/g, '\n')
    .replace(/<\/w:tc>/g, ' | ');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return decodeXmlEntities(stripped);
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class OCRService {
  private apiKey: string;

  constructor() {
    this.apiKey = (process.env.MISTRAL_API_KEY || '').trim();
  }

  public async extractText(filePath: string): Promise<string> {
    console.log(`Extracting text from path: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileLower = filePath.toLowerCase();
    let text = '';

    if (fileLower.endsWith('.pdf')) {
      text = await this.parsePdf(filePath);
    } else if (fileLower.endsWith('.txt') || fileLower.endsWith('.md') || fileLower.endsWith('.json')) {
      text = fs.readFileSync(filePath, 'utf8');
    } else if (fileLower.endsWith('.docx')) {
      text = this.parseDocx(filePath);
    } else if (fileLower.endsWith('.pptx')) {
      text = this.parsePptx(filePath);
    } else {
      throw new Error(`Unsupported file type: ${filePath}`);
    }

    const cleaned = normalizeExtractedText(text);
    if (cleaned.length < 20) {
      throw new Error(
        'Could not extract readable text from this file. If your PDF is a scanned image, please upload a text-selectable PDF, DOCX, or TXT resume.'
      );
    }

    return cleaned;
  }

  private async parsePdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parsedData = await pdf(dataBuffer);
      return parsedData.text || '';
    } catch (err) {
      console.error('Local PDF parsing failed:', err);
      throw new Error(`Failed to parse PDF file: ${(err as Error).message}`);
    }
  }

  private parseDocx(filePath: string): string {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const xmlParts = extractZipEntry(dataBuffer, /^word\/(document|header\d+|footer\d+)\.xml$/i);
      if (xmlParts.length === 0) {
        throw new Error('No document XML content found inside DOCX file.');
      }
      return xmlParts.map(xmlToPlainText).join('\n');
    } catch (err) {
      console.error('DOCX parsing failed:', err);
      throw new Error(`Failed to parse DOCX file: ${(err as Error).message}`);
    }
  }

  private parsePptx(filePath: string): string {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const xmlParts = extractZipEntry(dataBuffer, /^ppt\/slides\/slide\d+\.xml$/i);
      if (xmlParts.length === 0) {
        throw new Error('No slide XML content found inside PPTX file.');
      }
      return xmlParts.map(xmlToPlainText).join('\n');
    } catch (err) {
      console.error('PPTX parsing failed:', err);
      throw new Error(`Failed to parse PPTX file: ${(err as Error).message}`);
    }
  }
}

export const ocrService = new OCRService();
