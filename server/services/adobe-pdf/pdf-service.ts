import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  DocumentMergeParams,
  OutputFormat,
  DocumentMergeJob,
  DocumentMergeResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError,
} from "@adobe/pdfservices-node-sdk";
import fs from "fs";
import path from "path";

let pdfServicesInstance: PDFServices | null = null;

function getPDFServices(): PDFServices {
  if (!pdfServicesInstance) {
    const clientId = process.env.ADOBE_CLIENT_ID;
    const clientSecret = process.env.ADOBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Adobe PDF Services credentials not configured. Set ADOBE_CLIENT_ID and ADOBE_CLIENT_SECRET.");
    }

    const credentials = new ServicePrincipalCredentials({
      clientId,
      clientSecret,
    });

    pdfServicesInstance = new PDFServices({ credentials });
  }
  return pdfServicesInstance;
}

export interface DocumentMergeOptions {
  templatePath: string;
  jsonData: Record<string, any>;
  outputFormat?: "pdf" | "docx";
  outputPath?: string;
}

export async function mergeDocumentToPDF(options: DocumentMergeOptions): Promise<Buffer> {
  const { templatePath, jsonData, outputFormat = "pdf" } = options;

  const pdfServices = getPDFServices();

  const readStream = fs.createReadStream(templatePath);

  try {
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.DOCX,
    });

    const params = new DocumentMergeParams({
      jsonDataForMerge: jsonData,
      outputFormat: outputFormat === "pdf" ? OutputFormat.PDF : OutputFormat.DOCX,
    });

    const job = new DocumentMergeJob({ inputAsset, params });

    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: DocumentMergeResult,
    });

    const resultAsset = pdfServicesResponse.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      streamAsset.readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      streamAsset.readStream.on("end", () => resolve(Buffer.concat(chunks)));
      streamAsset.readStream.on("error", reject);
    });
  } finally {
    readStream.destroy();
  }
}

export async function generatePDFFromTemplate(
  templateName: string,
  data: Record<string, any>,
  outputFormat: "pdf" | "docx" = "pdf"
): Promise<Buffer> {
  const templatesDir = path.join(process.cwd(), "server", "services", "adobe-pdf", "templates");
  const templatePath = path.join(templatesDir, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  return mergeDocumentToPDF({
    templatePath,
    jsonData: data,
    outputFormat,
  });
}

export function isAdobePDFConfigured(): boolean {
  return !!(process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET);
}

export { getPDFServices };
