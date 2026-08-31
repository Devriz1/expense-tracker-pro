import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { parseUpiUri, type UpiPaymentData } from '../utils/upiParser';

interface UPIQrScannerProps {
  onScanSuccess: (data: UpiPaymentData) => void;
  onClose: () => void;
}

export default function UPIQrScanner({ onScanSuccess, onClose }: UPIQrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'upi-qr-scanner';

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        const cameraId = devices?.[0]?.id || { facingMode: 'environment' };

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            const data = parseUpiUri(decodedText);
            if (data) {
              scanner.stop().then(() => {
                setIsScanning(false);
                onScanSuccess(data);
              });
            } else {
              setError('Invalid UPI QR code. Please scan a valid UPI payment QR.');
            }
          },
          () => {
            // ignore scan failures
          }
        );

        setIsScanning(true);
        setError('');
      } catch (err) {
        console.error('Camera error:', err);
        setError('Unable to access camera. Please grant camera permissions or use a supported browser.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Scan UPI QR Code</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
            <div id={containerId} className="w-full h-full" />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 text-sm text-left">{error}</p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            Position the UPI QR code within the frame to scan
          </p>
        </div>
      </div>
    </div>
  );
}
