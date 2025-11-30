import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, X } from 'lucide-react';
import { cropImageToCircle } from '@/utils/cropImageToCircle';
import type { Area } from 'react-easy-crop';

interface LogoCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onCancel: () => void;
  onComplete: (croppedBlob: Blob) => void;
}

export function LogoCropperModal({
  isOpen,
  imageFile,
  onCancel,
  onComplete,
}: LogoCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      setImageError(null);
      setLoadingImage(false);
      setMediaSize(null);
      return;
    }

    if (!isOpen) {
      return; // Don't load if modal is closed
    }

    console.log('Loading image file:', imageFile.name, imageFile.type, imageFile.size);
    setLoadingImage(true);
    setImageError(null);
    setImageLoaded(false);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      console.log('FileReader onload, result type:', typeof result, 'length:', result?.toString().length);
      if (result && typeof result === 'string') {
        console.log('Image loaded successfully! Setting imageSrc...');
        setImageSrc(result);
        setLoadingImage(false);
        // Reset crop state when new image loads
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setMediaSize(null);
      } else {
        console.error('Invalid result from FileReader:', result);
        setImageError('Failed to load image - invalid result');
        setLoadingImage(false);
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setImageError('Failed to read image file');
      setLoadingImage(false);
    };
    
    reader.onabort = () => {
      console.error('FileReader aborted');
      setImageError('Image loading was cancelled');
      setLoadingImage(false);
    };
    
    try {
      reader.readAsDataURL(imageFile);
    } catch (error) {
      console.error('Error reading file:', error);
      setImageError('Failed to read image file: ' + (error instanceof Error ? error.message : String(error)));
      setLoadingImage(false);
    }

    // Cleanup function
    return () => {
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [imageFile, isOpen]);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      console.error('Missing imageSrc or croppedAreaPixels:', { imageSrc: !!imageSrc, croppedAreaPixels });
      return;
    }

    if (!mediaSize) {
      console.error('Media size not loaded yet');
      return;
    }

    setProcessing(true);
    try {
      console.log('Applying crop with:', {
        croppedAreaPixels,
        mediaSize
      });
      
      const croppedBlob = await cropImageToCircle(
        imageSrc,
        croppedAreaPixels,
        mediaSize,
        200
      );
      
      console.log('Crop complete, blob size:', croppedBlob.size);
      onComplete(croppedBlob);
      // Reset state
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setMediaSize(null);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageSrc(null);
    setMediaSize(null);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-full w-full md:max-w-2xl p-0 flex flex-col sm:rounded-lg" style={{ maxHeight: '90vh', height: 'auto' }}>
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle>Crop Logo</DialogTitle>
          <DialogDescription>
            Adjust the image position and zoom to crop your logo into a perfect circle
          </DialogDescription>
        </DialogHeader>

        <div 
          className="flex-1 relative bg-black/5 dark:bg-black/20 w-full overflow-hidden"
          style={{ 
            minHeight: '400px',
            height: '400px',
            maxHeight: '60vh'
          }}
        >
          {loadingImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading image...</p>
            </div>
          )}
          
          {imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 z-10">
              <p className="text-sm text-destructive font-medium">{imageError}</p>
              <p className="text-xs text-muted-foreground">Please try selecting a different image</p>
            </div>
          )}
          
          {!loadingImage && !imageError && imageSrc && (
            <div className="absolute inset-0 w-full h-full">
              {console.log('Rendering Cropper with imageSrc length:', imageSrc.length)}
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
                restrictPosition={true}
                onMediaLoaded={(size) => {
                  console.log('✅ Media loaded in Cropper:', size);
                  setMediaSize(size);
                  setImageLoaded(true);
                }}
                onImageError={(error) => {
                  console.error('❌ Cropper image error:', error);
                  setImageError('Failed to load image in cropper');
                }}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  },
                  cropAreaStyle: {
                    border: '2px solid white',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  },
                  mediaStyle: {
                    objectFit: 'contain',
                  },
                }}
              />
            </div>
          )}
          
          {!loadingImage && !imageError && !imageSrc && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <p className="text-sm text-muted-foreground">No image selected</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 space-y-4 border-t flex-shrink-0 bg-background">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Zoom</span>
              <span className="font-medium">{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={processing}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={processing || !croppedAreaPixels || !mediaSize}
              className="w-full sm:w-auto"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

