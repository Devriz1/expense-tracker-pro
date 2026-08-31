import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, X, CheckCircle } from 'lucide-react';
import { extractReceiptData, type ReceiptData } from '../utils/ocr';

interface ReceiptScannerProps {
  onScanComplete: (data: ReceiptData) => void;
  onClose: () => void;
}

export default function ReceiptScanner({ onScanComplete, onClose }: ReceiptScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!image) return;
    setIsScanning(true);
    setError('');

    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], 'receipt.jpg', { type: blob.type });
      const data = await extractReceiptData(file);
      setResult(data);
      onScanComplete(data);
    } catch (err) {
      console.error('OCR scan failed:', err);
      setError('Failed to scan receipt. Please try again with a clearer image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseData = () => {
    if (result) {
      onScanComplete(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Scan Receipt</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!image ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">Upload Receipt Image</p>
                <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img src={image} alt="Receipt preview" className="w-full h-64 object-contain" />
                <button
                  onClick={() => {
                    setImage(null);
                    setResult(null);
                    setError('');
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {!result ? (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="btn btn-primary w-full"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Scan Receipt
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Scan Complete</span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    {result.amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Amount</span>
                        <span className="text-sm font-medium text-gray-900">₹{result.amount.toFixed(2)}</span>
                      </div>
                    )}
                    {result.vendor && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Vendor</span>
                        <span className="text-sm font-medium text-gray-900">{result.vendor}</span>
                      </div>
                    )}
                    {result.date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Date</span>
                        <span className="text-sm font-medium text-gray-900">{result.date}</span>
                      </div>
                    )}
                    {!result.amount && !result.vendor && !result.date && (
                      <p className="text-sm text-gray-500">No details could be extracted. Please enter manually.</p>
                    )}
                  </div>

                  <button onClick={handleUseData} className="btn btn-success w-full">
                    Use Extracted Data
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          {result?.rawText && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Raw OCR Text</summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {result.rawText}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
