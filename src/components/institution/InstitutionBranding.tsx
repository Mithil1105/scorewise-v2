import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitution, Institution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Paintbrush, Upload, Loader2, Building2, Save, Check
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${institution.id}-logo.${fileExt}`;
      const filePath = `institution-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('institution_logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, try to create it or use a different approach
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
          throw new Error('Storage bucket not configured. Please contact support or run the migration to create the bucket.');
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('institution_logos')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded logo');
      }

      setLogoUrl(urlData.publicUrl);
      toast({ title: 'Logo uploaded!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          logo_url: logoUrl || null,
          theme_color: themeColor
        })
        .eq('id', institution.id);

      if (error) throw error;

      toast({ title: 'Branding saved!' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Logo
                </Button>
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
            <Avatar className="h-12 w-12">
              <AvatarImage src={logoUrl} />
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
    </Card>
  );
}
