import { useState, useRef } from "react";
import { Upload, FileText, Loader2, Check, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { parseReceipt, type OCRResult } from "@/services/ocr";
import type { ReceiptLineItem } from "@/types";

interface ReceiptUploadProps {
  onItemsConfirmed: (
    items: ReceiptLineItem[],
    storeName: string,
    date: string,
  ) => void;
}

type Stage = "upload" | "processing" | "review";

export function ReceiptUpload({ onItemsConfirmed }: ReceiptUploadProps) {
  const [stage, setStage] = useState<Stage>("upload");
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editableItems, setEditableItems] = useState<ReceiptLineItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage("processing");

    const result = await parseReceipt(file);
    setOcrResult(result);
    setEditableItems(result.items);
    setStage("review");
  }

  function handleDemoUpload() {
    // Trigger with a fake file for demo purposes
    setStage("processing");
    const fakeFile = new File([""], "receipt.jpg", { type: "image/jpeg" });
    parseReceipt(fakeFile).then((result) => {
      setOcrResult(result);
      setEditableItems(result.items);
      setStage("review");
    });
  }

  function handleRemoveItem(idx: number) {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleUpdateItem(idx: number, updates: Partial<ReceiptLineItem>) {
    setEditableItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...updates } : item)),
    );
    setEditingIdx(null);
  }

  function handleConfirm() {
    if (!ocrResult) return;
    onItemsConfirmed(editableItems, ocrResult.storeName, ocrResult.date);
    // Reset
    setStage("upload");
    setOcrResult(null);
    setEditableItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (stage === "processing") {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-fuego-500" />
        <div className="text-center">
          <p className="font-medium">Processing receipt...</p>
          <p className="text-sm text-muted-foreground">
            Extracting items with OCR
          </p>
        </div>
      </Card>
    );
  }

  if (stage === "review" && ocrResult) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">
              Review Items
            </h3>
            <p className="text-sm text-muted-foreground">
              {ocrResult.storeName} · {editableItems.length} items · $
              {editableItems
                .reduce((s, i) => s + i.price, 0)
                .toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStage("upload");
                setOcrResult(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Add to Pantry
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {editableItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
            >
              {editingIdx === idx ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Input
                    defaultValue={item.name}
                    className="h-7 w-40 text-sm"
                    onBlur={(e) =>
                      handleUpdateItem(idx, { name: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleUpdateItem(idx, {
                          name: (e.target as HTMLInputElement).value,
                        });
                    }}
                    autoFocus
                  />
                  <Input
                    defaultValue={String(item.quantity)}
                    className="h-7 w-16 text-sm"
                    type="number"
                    onBlur={(e) =>
                      handleUpdateItem(idx, {
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.unit}
                  </span>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.brand && (
                    <Badge variant="secondary" className="text-[10px]">
                      {item.brand}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                ${item.price.toFixed(2)}
              </span>
              <button
                onClick={() => setEditingIdx(idx)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Edit item"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleRemoveItem(idx)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove item"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Upload stage
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuego-50 text-fuego-600">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium">Upload a receipt</p>
          <p className="text-sm text-muted-foreground">
            Photo or PDF — we'll extract the items automatically
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Choose File
          </Button>
          <Button size="sm" onClick={handleDemoUpload}>
            Try Demo Receipt
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
          aria-label="Upload receipt file"
        />
      </div>
    </Card>
  );
}
