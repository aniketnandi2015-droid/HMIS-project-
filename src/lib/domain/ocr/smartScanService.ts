import {
  DrugMaster,
  StockBatch,
  OcrExtractedFields,
  SmartScanMatchResult,
} from '../../types/pharmaassist';

export class SmartScanService {
  /**
   * Normalizes raw OCR text from packaging.
   */
  public static normalizeText(text: string): string {
    return text
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Parses raw extracted OCR text into structured pharmaceutical fields.
   */
  public static parsePackagingText(rawText: string): OcrExtractedFields {
    const text = this.normalizeText(rawText);

    // 1. Batch Number extraction: matches patterns like "B.No.", "BATCH", "LOT", "B.No: ABC-123"
    let batchNumber: string | undefined;
    const batchRegex = /(?:B\.?\s*No\.?|BATCH|LOT(?:\s*NO\.?)?)[\s:]*([A-Z0-9\-_]{3,15})/i;
    const batchMatch = text.match(batchRegex);
    if (batchMatch && batchMatch[1]) {
      batchNumber = batchMatch[1].toUpperCase();
    }

    // 2. Lot Number extraction
    let lotNumber: string | undefined;
    const lotRegex = /(?:LOT(?:\s*NO\.?)?)[\s:]*([A-Z0-9\-_]{3,15})/i;
    const lotMatch = text.match(lotRegex);
    if (lotMatch && lotMatch[1]) {
      lotNumber = lotMatch[1].toUpperCase();
    } else if (batchNumber) {
      lotNumber = `LOT-${batchNumber.slice(-4)}`;
    }

    // 3. Expiry Date extraction: MM/YY, MM/YYYY, or YYYY-MM
    let expiryDate: string | undefined;
    const expRegex = /(?:EXP(?:\.|\s*DATE|\s*DT)?[\s:]*)(\d{1,2})[\/\-](\d{2,4})/i;
    const expMatch = text.match(expRegex);
    if (expMatch) {
      let month = parseInt(expMatch[1]);
      let year = parseInt(expMatch[2]);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12) {
        // Last day of that expiry month
        const lastDay = new Date(year, month, 0).getDate();
        expiryDate = `${year}-${month < 10 ? '0' : ''}${month}-${lastDay < 10 ? '0' : ''}${lastDay}`;
      }
    }

    // 4. Manufacturing Date extraction: MFG MM/YY
    let manufacturingDate: string | undefined;
    const mfgRegex = /(?:MFG(?:\.|\s*DATE|\s*DT)?[\s:]*)(\d{1,2})[\/\-](\d{2,4})/i;
    const mfgMatch = text.match(mfgRegex);
    if (mfgMatch) {
      let month = parseInt(mfgMatch[1]);
      let year = parseInt(mfgMatch[2]);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12) {
        manufacturingDate = `${year}-${month < 10 ? '0' : ''}${month}-01`;
      }
    }

    // 5. Strength extraction: e.g., 650mg, 500mg+125mg, 20mg, 10mg
    let strength: string | undefined;
    const strengthRegex = /(\d{1,4}\s*(?:mg|g|mcg|ml)(?:\s*\+\s*\d{1,4}\s*(?:mg|g|mcg|ml))?)/i;
    const strengthMatch = text.match(strengthRegex);
    if (strengthMatch) {
      strength = strengthMatch[1].replace(/\s+/g, '').toLowerCase();
    }

    // 6. Dosage form detection
    let dosageForm: string | undefined;
    if (/tablet|tab\b/i.test(text)) dosageForm = 'Tablet';
    else if (/capsule|cap\b/i.test(text)) dosageForm = 'Capsule';
    else if (/syrup|suspension|oral\s+liq/i.test(text)) dosageForm = 'Syrup';
    else if (/sachet|powder/i.test(text)) dosageForm = 'Powder';
    else if (/injection|vial/i.test(text)) dosageForm = 'Injection';

    // 7. Barcode / GTIN number extraction (8 to 14 digits)
    let barcodeNumber: string | undefined;
    const barcodeRegex = /\b(\d{8,14})\b/;
    const barcodeMatch = text.match(barcodeRegex);
    if (barcodeMatch) {
      barcodeNumber = barcodeMatch[1];
    }

    // Compute heuristic OCR confidence score (0.0 to 1.0)
    let recognizedCount = 0;
    if (batchNumber) recognizedCount += 2;
    if (expiryDate) recognizedCount += 2;
    if (strength) recognizedCount += 1.5;
    if (dosageForm) recognizedCount += 1;
    if (barcodeNumber) recognizedCount += 1.5;

    const confidence = Math.min(1.0, Number((recognizedCount / 8).toFixed(2)));

    return {
      rawText,
      batchNumber,
      lotNumber,
      manufacturingDate,
      expiryDate,
      strength,
      dosageForm,
      barcodeNumber,
      confidence,
    };
  }

  /**
   * Matches extracted fields against Drug Master catalog.
   * Safety invariant: OCR is never authoritative alone. Requires Drug Master candidate mapping.
   */
  public static matchToDrugMaster(
    extracted: OcrExtractedFields,
    allDrugs: DrugMaster[],
    allBatches: StockBatch[]
  ): SmartScanMatchResult {
    const rawLower = extracted.rawText.toLowerCase();

    let bestMatch: DrugMaster | undefined;
    let highestScore = 0;

    // 1. Direct barcode / identifier match (Highest Confidence)
    if (extracted.barcodeNumber) {
      const directMatch = allDrugs.find((d) =>
        d.identifiers.some((id) => id === extracted.barcodeNumber)
      );
      if (directMatch) {
        bestMatch = directMatch;
        highestScore = 95;
      }
    }

    // 2. Text / Brand / Generic candidate scoring
    if (!bestMatch) {
      for (const drug of allDrugs) {
        if (!drug.active) continue;
        let score = 0;
        const brandLower = drug.brandName.toLowerCase();
        const genericLower = drug.genericName.toLowerCase();

        // Exact brand match
        if (rawLower.includes(brandLower)) {
          score += 50;
        } else {
          // Token match
          const brandTokens = brandLower.split(/\s+/);
          const matchedTokens = brandTokens.filter((tok) => tok.length > 2 && rawLower.includes(tok));
          score += (matchedTokens.length / brandTokens.length) * 35;
        }

        // Generic match
        if (rawLower.includes(genericLower)) {
          score += 30;
        }

        // Strength match
        if (extracted.strength && drug.strength.toLowerCase().replace(/\s+/g, '') === extracted.strength) {
          score += 20;
        }

        // Dosage form match
        if (extracted.dosageForm && drug.dosageForm === extracted.dosageForm) {
          score += 10;
        }

        if (score > highestScore && score >= 40) {
          highestScore = score;
          bestMatch = drug;
        }
      }
    }

    // 3. Match existing batch if batchNumber was detected
    let matchedBatch: StockBatch | undefined;
    if (bestMatch && extracted.batchNumber) {
      matchedBatch = allBatches.find(
        (b) =>
          b.drugId === bestMatch?.id &&
          b.batchNumber.toLowerCase() === extracted.batchNumber?.toLowerCase()
      );
    }

    const confidenceScore = Number((highestScore / 100).toFixed(2));
    const requiresConfirmation = confidenceScore < 0.85;

    let notes = '';
    if (bestMatch) {
      notes = `Matched to "${bestMatch.brandName}" with score ${highestScore}/100.`;
    } else {
      notes = 'No confident medicine match found. Please verify or input manually.';
    }

    let expiryWarning: string | undefined;
    if (matchedBatch) {
      const expDate = new Date(matchedBatch.expiryDate).getTime();
      const now = new Date().getTime();
      const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 90) {
        expiryWarning = `Batch ${matchedBatch.batchNumber} is near expiry (${daysLeft > 0 ? daysLeft : 0} days remaining).`;
      }
    }

    return {
      matchedDrug: bestMatch,
      matchedBatch,
      confidence: confidenceScore,
      extractedFields: extracted,
      requiresConfirmation,
      matchScore: highestScore,
      notes,
      expiryWarning,
    };
  }
}
