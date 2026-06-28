import { useRef } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Attendee, Page } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';

interface QRCodeViewProps {
  attendee: Attendee;
  onNavigate: (page: Page) => void;
}

export default function QRCodeView({ attendee, onNavigate }: QRCodeViewProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrData = JSON.stringify({
    id: attendee.id,
    name: attendee.name,
    email: attendee.email,
    department: attendee.department,
  });

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);

        const link = document.createElement('a');
        link.download = `QR-${attendee.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${attendee.name}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
            h2 { margin-bottom: 10px; }
            p { color: #666; margin: 4px 0; }
          </style>
        </head>
        <body>
          <h2>${attendee.name}</h2>
          <p>${attendee.email}</p>
          <p>${attendee.department} — ${attendee.position}</p>
          <div style="margin: 20px 0;">${svgData}</div>
          <p style="font-size: 12px; color: #999;">Scan to check in/out</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => onNavigate('attendees')}
        className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Attendees
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center transition-colors">
        <div className={`w-16 h-16 rounded-full ${getInitialsBg(attendee.name)} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4`}>
          {getInitials(attendee.name)}
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{attendee.name}</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm">{attendee.email}</p>
        <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">{attendee.department} · {attendee.position}</p>

        <div
          ref={qrRef}
          className="inline-block bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-600 mt-6"
        >
          <QRCodeSVG
            value={qrData}
            size={220}
            level="H"
            includeMargin={true}
            fgColor="#1e40af"
            bgColor="#ffffff"
          />
        </div>

        <p className="text-sm text-gray-400 dark:text-slate-500 mt-4">
          ID: <code className="bg-gray-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded text-xs">{attendee.id}</code>
        </p>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
          >
            <Download size={18} />
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
