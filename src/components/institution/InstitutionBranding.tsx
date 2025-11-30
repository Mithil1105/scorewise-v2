import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitution, Institution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogoCropperModal } from '@/components/institution/LogoCropperModal';
import { 
  Paintbrush, Upload, Loader2, Building2, Save, Check, Trash2
} from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

interface InstitutionBrandingProps {
  institution: Institution;
  onUpdate: () => void;
}

export function InstitutionBranding({ institution, onUpdate }: InstitutionBrandingProps) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState(institution.logo_url || '');
  const [themeColor, setThemeColor] = useState(institution.theme_color || '#3b82f6');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Sync state when institution prop changes (e.g., after refresh or save)
  // This ensures the component always reflects the latest branding data from the database
  useEffect(() => {
    if (institution) {
      const newLogoUrl = institution.logo_url || '';
      const newThemeColor = institution.theme_color || '#3b82f6';
      
      // Always sync with the institution prop to ensure consistency
      setLogoUrl(newLogoUrl);
      setThemeColor(newThemeColor);
    }
  }, [institution?.id, institution?.logo_url, institution?.theme_color]);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 2MB', variant: 'destructive' });
      return;
    }

    // Open cropper modal with selected file
    setSelectedImageFile(file);
    setCropperOpen(true);
    
    // Clear the file input so the same file can be selected again
    e.target.value = '';
  };

  const handleCropperComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setUploading(true);
    
    try {
      // Always delete old logo first to ensure clean replacement
      if (institution.logo_url && institution.logo_url.includes('institution_logos')) {
        try {
          // Extract file path from URL
          const urlParts = institution.logo_url.split('/institution_logos/');
          if (urlParts.length > 1) {
            const oldFilePath = urlParts[1].split('?')[0];
            
            const { error: deleteError } = await supabase.storage
              .from('institution_logos')
              .remove([oldFilePath]);
            
            if (deleteError) {
              console.warn('Could not delete old logo (non-critical):', deleteError);
            } else {
              console.log('Old logo deleted successfully:', oldFilePath);
            }
            // Small delay to ensure deletion is processed
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (deleteError) {
          console.warn('Error deleting old logo (non-critical):', deleteError);
        }
      }

      // Use timestamp in filename to ensure unique file
      const timestamp = Date.now();
      const fileName = `${institution.id}-logo-${timestamp}.png`;
      const filePath = `institution-logos/${fileName}`;

      // Upload cropped logo as PNG
      const { error: uploadError } = await supabase.storage
        .from('institution_logos')
        .upload(filePath, croppedBlob, { 
          upsert: false,
          cacheControl: '3600',
          contentType: 'image/png'
        });

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket') || uploadError.message?.includes('does not exist')) {
          throw new Error(
            'Storage bucket "institution_logos" not found. ' +
            'Please run the migration file: supabase/migrations/20251201000003_ensure_institution_logos_bucket.sql ' +
            'in your Supabase SQL editor, or create the bucket manually in Supabase Dashboard > Storage.'
          );
        }
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('institution_logos')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded logo');
      }

      // Use clean URL (without query params) for database storage
      const cleanLogoUrl = urlData.publicUrl;
      console.log('Cropped logo uploaded, URL:', cleanLogoUrl);
      
      // Update local state immediately with cache-busting to force browser refresh
      const cacheBust = Date.now();
      setLogoUrl(`${cleanLogoUrl}?t=${cacheBust}`);
      
      // Auto-save immediately after upload (save clean URL to database)
      await saveBrandingToDB(cleanLogoUrl, themeColor);
      
      toast({ 
        title: 'Logo uploaded and saved!', 
        description: 'Your cropped logo has been saved successfully.'
      });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast({ 
        title: 'Upload failed', 
        description: err.message || 'Failed to upload logo. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
      setSelectedImageFile(null);
    }
  };

  const handleCropperCancel = () => {
    setCropperOpen(false);
    setSelectedImageFile(null);
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl && !institution.logo_url) {
      toast({ 
        title: 'No logo to remove', 
        description: 'There is no logo currently set.',
        variant: 'destructive' 
      });
      return;
    }

    setRemoving(true);
    try {
      // Delete logo from storage if it exists
      if (institution.logo_url && institution.logo_url.includes('institution_logos')) {
        try {
          // Extract file path from URL
          const urlParts = institution.logo_url.split('/institution_logos/');
          if (urlParts.length > 1) {
            const oldFilePath = urlParts[1].split('?')[0];
            
            const { error: deleteError } = await supabase.storage
              .from('institution_logos')
              .remove([oldFilePath]);
            
            if (deleteError) {
              console.warn('Could not delete logo from storage:', deleteError);
              // Continue to remove from database even if storage deletion fails
            } else {
              console.log('Logo deleted from storage:', oldFilePath);
            }
          }
        } catch (deleteError) {
          console.warn('Error deleting logo from storage:', deleteError);
          // Continue to remove from database even if storage deletion fails
        }
      }

      // Remove logo URL from database
      await saveBrandingToDB('', themeColor);
      
      // Clear local state
      setLogoUrl('');
      
      toast({ 
        title: 'Logo removed!', 
        description: 'The logo has been removed successfully.'
      });
    } catch (err: any) {
      console.error('Error removing logo:', err);
      toast({ 
        title: 'Error removing logo', 
        description: err.message || 'Failed to remove logo. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setRemoving(false);
    }
  };

  const saveBrandingToDB = async (logo: string, color: string) => {
    // First, update the database and get the updated data back
    const { data: updatedData, error: updateError } = await supabase
      .from('institutions')
      .update({
        logo_url: logo || null,
        theme_color: color,
        updated_at: new Date().toISOString()
      })
      .eq('id', institution.id)
      .select('id, name, code, owner_user_id, logo_url, theme_color, plan, is_active, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }
    
    if (!updatedData) {
      throw new Error('Failed to update institution branding');
    }
    
    // Update local state immediately with the response from the database
    setLogoUrl(updatedData.logo_url || '');
    setThemeColor(updatedData.theme_color || '#3b82f6');
    
    // Then refresh the institution context to ensure all components get the updated data
    if (onUpdate) {
      await onUpdate();
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      await saveBrandingToDB(logoUrl, themeColor);
      toast({ 
        title: 'Branding saved!', 
        description: 'Your changes have been saved and will persist after refresh.'
      });
    } catch (err: any) {
      console.error('Error saving branding:', err);
      toast({ 
        title: 'Error saving branding', 
        description: err.message || 'Failed to save branding. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save theme color when it changes (debounced)
  useEffect(() => {
    // Skip on initial mount - only save if it's different from the institution's current value
    const currentThemeColor = institution.theme_color || '#3b82f6';
    if (themeColor === currentThemeColor) return;
    
    const timeoutId = setTimeout(() => {
      saveBrandingToDB(logoUrl, themeColor).catch(err => {
        console.error('Auto-save failed:', err);
        toast({ 
          title: 'Auto-save failed', 
          description: err.message || 'Could not save theme color automatically',
          variant: 'destructive' 
        });
      });
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeColor]); // Only auto-save theme color, not logo URL

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5" />
          Institution Branding
        </CardTitle>
        <CardDescription>Customize your institution's appearance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Institution Logo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={logoUrl} />
              <AvatarFallback className="text-2xl">
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileSelect}
                  className="hidden"
                  id="logo-upload"
                  disabled={uploading || removing || cropperOpen}
                />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploading || removing || cropperOpen}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Logo
                  </Button>
                </div>
                {(logoUrl || institution.logo_url) && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveLogo}
                    disabled={uploading || removing}
                    className="text-destructive hover:text-destructive"
                  >
                    {removing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Remove Logo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 200x200px, max 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Logo URL Input */}
        <div className="space-y-2">
          <Label>Or enter logo URL</Label>
          <Input
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>

        {/* Theme Color */}
        <div className="space-y-3">
          <Label>Theme Color</Label>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg border-2 border-border"
              style={{ backgroundColor: themeColor }}
            />
            <Input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-20 h-10 p-1"
            />
            <Input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              placeholder="#3b82f6"
              className="w-28"
            />
          </div>
          
          {/* Preset Colors */}
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setThemeColor(color)}
                className="h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center"
                style={{ 
                  backgroundColor: color,
                  borderColor: themeColor === color ? 'white' : 'transparent'
                }}
              >
                {themeColor === color && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div 
            className="p-4 rounded-lg border flex items-center gap-3"
            style={{ borderColor: themeColor }}
          >
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarImage 
                src={logoUrl} 
                className="object-cover"
                alt="Institution logo preview"
              />
              <AvatarFallback style={{ backgroundColor: themeColor, color: 'white' }}>
                {institution.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold" style={{ color: themeColor }}>
                {institution.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Powered by ScoreWise
              </p>
            </div>
          </div>
        </div>

        <Button onClick={saveBranding} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Branding
        </Button>
      </CardContent>

      {/* Logo Cropper Modal */}
      <LogoCropperModal
        isOpen={cropperOpen}
        imageFile={selectedImageFile}
        onCancel={handleCropperCancel}
        onComplete={handleCropperComplete}
      />
    </Card>
  );
}
