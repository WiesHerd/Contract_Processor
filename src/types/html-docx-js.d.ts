declare module 'html-docx-js/dist/html-docx' {
  interface HTMLDocx {
    asBlob: (html: string) => Blob;
  }
  const htmlDocx: HTMLDocx;
  export default htmlDocx;
}

declare module 'html2pdf.js' {
  interface HTML2PDFOptions {
    margin?: number;
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: { scale?: number };
    jsPDF?: { unit?: string; format?: string; orientation?: string };
  }

  interface HTML2PDF {
    from: (element: HTMLElement | string) => HTML2PDF;
    set: (options: HTML2PDFOptions) => HTML2PDF;
    save: () => Promise<void>;
  }

  const html2pdf: HTML2PDF;
  export default html2pdf;
} 