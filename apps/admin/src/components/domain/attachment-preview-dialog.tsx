import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FileItem } from "@/components/domain/file-upload";
import { useAttachmentAccessURLMap } from "@/hooks/use-attachment-access-url-map";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const pdfOptions = {
  cMapPacked: true,
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
};

type AttachmentPreviewDialogProps = {
  file: FileItem | null;
  items?: FileItem[];
  open: boolean;
  onClose: () => void;
};

export function AttachmentPreviewDialog({
  file,
  items,
  open,
  onClose,
}: AttachmentPreviewDialogProps) {
  const currentFile = open ? file : null;
  const [imageMetaMap, setImageMetaMap] = useState<
    Record<string, { height: number; width: number }>
  >({});
  const imageItems = useMemo(() => {
    const source = items?.length ? items : file ? [file] : [];
    const images = source.filter((item) => item.type === "image");

    if (
      file?.type === "image" &&
      !images.some((item) => item.url === file.url)
    ) {
      images.push(file);
    }

    return images;
  }, [file, items]);
  const imageAccessURLMap = useAttachmentAccessURLMap(
    imageItems.map((item) => ({ name: item.name, url: item.url })),
  );

  useEffect(() => {
    let cancelled = false;

    imageItems.forEach((item) => {
      if (imageMetaMap[item.url]) {
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (cancelled || !image.naturalWidth || !image.naturalHeight) {
          return;
        }

        setImageMetaMap((current) => {
          if (current[item.url]) {
            return current;
          }

          return {
            ...current,
            [item.url]: {
              height: image.naturalHeight,
              width: image.naturalWidth,
            },
          };
        });
      };
      image.src = resolveAttachmentDisplayURL(item.url, imageAccessURLMap[item.url]);
    });

    return () => {
      cancelled = true;
    };
  }, [imageAccessURLMap, imageItems, imageMetaMap]);

  const imageSlides = useMemo(
    () =>
      imageItems.map((item) => ({
        alt: item.name,
        src: resolveAttachmentDisplayURL(item.url, imageAccessURLMap[item.url]),
        ...imageMetaMap[item.url],
      })),
    [imageAccessURLMap, imageItems, imageMetaMap],
  );
  const currentImageIndex = useMemo(() => {
    if (!currentFile || currentFile.type !== "image") return 0;
    const index = imageItems.findIndex((item) => item.url === currentFile.url);
    return index >= 0 ? index : 0;
  }, [currentFile, imageItems]);

  if (!currentFile) {
    return null;
  }

  if (currentFile.type === "image") {
    if (!imageSlides[currentImageIndex]?.src) {
      return (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="flex h-[60vh] w-[90vw] max-w-3xl items-center justify-center">
            <PdfLoadingState />
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Lightbox
        open={open}
        close={onClose}
        index={currentImageIndex}
        slides={imageSlides}
        plugins={[Zoom]}
        carousel={{ finite: imageSlides.length <= 1 }}
        controller={{ closeOnBackdropClick: true }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        render={{
          buttonPrev: imageSlides.length <= 1 ? () => null : undefined,
          buttonNext: imageSlides.length <= 1 ? () => null : undefined,
        }}
      />
    );
  }

  return <PdfPreviewDialog file={currentFile} open={open} onClose={onClose} />;
}

function PdfPreviewDialog({
  file,
  open,
  onClose,
}: {
  file: FileItem;
  open: boolean;
  onClose: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [basePageWidth, setBasePageWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const pdfAccessURLMap = useAttachmentAccessURLMap(
    [{ name: file.name, url: file.url }],
    { disposition: "inline" },
  );
  const previewURL = resolveAttachmentDisplayURL(file.url, pdfAccessURLMap[file.url]);

  useEffect(() => {
    if (!open) {
      setContainerWidth(0);
      setBasePageWidth(0);
      setNumPages(0);
      setPdfData(null);
      setPdfError(false);
      setZoom(1);
      return;
    }

    setNumPages(0);
    setBasePageWidth(0);
    setPdfData(null);
    setPdfError(false);
    setZoom(1);
  }, [file.url, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!previewURL) {
      return;
    }

    const controller = new AbortController();
    const candidateURLs = Array.from(new Set([previewURL].filter(Boolean)));

    async function loadPdfData() {
      for (const candidateURL of candidateURLs) {
        try {
          const response = await fetch(candidateURL, {
            signal: controller.signal,
          });
          if (!response.ok) {
            continue;
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("pdf") && !candidateURL.toLowerCase().includes(".pdf")) {
            continue;
          }

          const buffer = await response.arrayBuffer();
          if (controller.signal.aborted || buffer.byteLength === 0) {
            return;
          }

          setPdfData(new Uint8Array(buffer));
          setPdfError(false);
          return;
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
        }
      }

      if (!controller.signal.aborted) {
        setPdfError(true);
      }
    }

    void loadPdfData();
    return () => controller.abort();
  }, [open, previewURL]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(element.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [file.url, open]);

  const fitWidthScale = useMemo(() => {
    if (!containerWidth || !basePageWidth) {
      return 1;
    }

    return Math.max((containerWidth - 24) / basePageWidth, 0.1);
  }, [basePageWidth, containerWidth]);
  const pageScale = useMemo(() => {
    return Math.max(fitWidthScale * zoom, 0.1);
  }, [fitWidthScale, zoom]);
  const pdfFile = useMemo(() => {
    if (!pdfData) {
      return null;
    }

    return { data: pdfData };
  }, [pdfData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[96vw]">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {numPages > 0 ? `共 ${numPages} 页` : "正在加载 PDF"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={() => setZoom(1)}
            >
              适应宽度
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
            >
              <ZoomOut className="size-4" />
            </Button>
            <span className="min-w-14 text-center text-sm font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setZoom((current) => Math.min(2.5, current + 0.25))}
            >
              <ZoomIn className="size-4" />
            </Button>
          </div>
        </div>
        <div
          ref={viewportRef}
          className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4 sm:p-6"
        >
          {pdfError ? (
            <PdfErrorState />
          ) : pdfFile ? (
            <Document
              file={pdfFile}
              options={pdfOptions}
              loading={<PdfLoadingState />}
              error={<PdfErrorState />}
              onLoadSuccess={(pdf) => {
                setNumPages(pdf.numPages);
                void pdf.getPage(1).then((page) => {
                  const viewport = page.getViewport({ scale: 1 });
                  setBasePageWidth(viewport.width);
                });
              }}
              onLoadError={() => {
                setNumPages(0);
                setBasePageWidth(0);
                setPdfError(true);
              }}
            >
              <div className={zoom <= 1 ? "flex min-w-full justify-center" : "w-fit"}>
                <div className="flex w-fit flex-col gap-4">
                  {Array.from({ length: numPages }, (_, index) => (
                    <div
                      key={`${file.url}-${index + 1}`}
                      className="w-fit overflow-hidden rounded-lg border bg-background shadow-sm"
                    >
                      <Page
                        pageNumber={index + 1}
                        scale={pageScale}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        loading={<PdfLoadingState compact />}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Document>
          ) : (
            <PdfLoadingState />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function resolveAttachmentDisplayURL(rawURL: string, accessURL?: string) {
  if (accessURL) {
    return accessURL;
  }

  if (/^https?:\/\//i.test(rawURL)) {
    return "";
  }

  return rawURL;
}

function PdfLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex min-h-40 items-center justify-center text-muted-foreground"
          : "flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      }
    >
      <Loader2 className="size-5 animate-spin" />
      {compact ? null : <span className="text-sm">PDF 加载中…</span>}
    </div>
  );
}

function PdfErrorState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <FileText className="size-10" />
      <div className="space-y-1 text-center">
        <p className="font-medium text-foreground">PDF 预览失败</p>
        <p className="text-sm">请确认文件可访问，或稍后重试。</p>
      </div>
    </div>
  );
}
