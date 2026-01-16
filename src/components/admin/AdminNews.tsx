import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send, ImagePlus, FileUp, X, Loader2 } from "lucide-react";
import { RecipientSelector } from "./RecipientSelector";

export function AdminNews() {
  const { user } = useAuth();
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).filter(file => 
        file.type.startsWith("image/")
      );
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    e.target.value = "";
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setDocuments(prev => [...prev, ...Array.from(files)]);
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[], bucket: string, folder: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of files) {
      const fileName = `${folder}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
      
      if (error) {
        console.error("Upload error:", error);
        throw error;
      }
      
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      urls.push(urlData.publicUrl);
    }
    
    return urls;
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      toast.error("Įveskite temą");
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error("Įveskite pranešimą");
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error("Pasirinkite bent vieną gavėją");
      return;
    }

    setSendingNotification(true);
    try {
      // Upload photos and documents
      let photoUrls: string[] = [];
      let documentUrls: string[] = [];
      
      if (photos.length > 0) {
        setUploadingPhotos(true);
        photoUrls = await uploadFiles(photos, "documents", "message-photos");
        setUploadingPhotos(false);
      }
      
      if (documents.length > 0) {
        setUploadingDocs(true);
        documentUrls = await uploadFiles(documents, "documents", "message-documents");
        setUploadingDocs(false);
      }

      // Create news entry
      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .insert({
          title: formData.subject,
          content: formData.message,
          published: true,
          author_id: user?.id,
        })
        .select()
        .single();

      if (newsError) throw newsError;

      // Insert recipients
      const recipientInserts = selectedRecipients.map(residentId => ({
        news_id: newsData.id,
        resident_id: residentId,
      }));

      const { error: recipientError } = await supabase
        .from("news_recipients")
        .upsert(recipientInserts, { onConflict: 'news_id,resident_id' });

      if (recipientError) throw recipientError;

      // Get residents with emails for notification
      const { data: residents, error: residentsError } = await supabase
        .from("residents")
        .select("id, full_name, email")
        .in("id", selectedRecipients)
        .not("email", "is", null);

      if (residentsError) throw residentsError;

      // Send email notifications via edge function
      const residentsWithEmail = residents?.filter(r => r.email) || [];
      
      if (residentsWithEmail.length > 0) {
        // Build message content with attachments info
        let fullContent = formData.message;
        
        if (photoUrls.length > 0) {
          fullContent += "\n\n📷 Nuotraukos:\n" + photoUrls.join("\n");
        }
        
        if (documentUrls.length > 0) {
          fullContent += "\n\n📎 Dokumentai:\n" + documentUrls.join("\n");
        }

        const { error: notifyError } = await supabase.functions.invoke("send-news-notification", {
          body: {
            newsId: newsData.id,
            newsTitle: formData.subject,
            newsContent: fullContent,
            recipients: residentsWithEmail.map(r => ({
              name: r.full_name,
              email: r.email,
            })),
          },
        });

        if (notifyError) {
          console.error("Error sending notifications:", notifyError);
          toast.warning(`Pranešimas išsaugotas, bet el. laiškų siuntimas nepavyko: ${notifyError.message}`);
        } else {
          toast.success(`Pranešimas išsiųstas ${residentsWithEmail.length} gavėjams`);
        }
      } else {
        toast.success(`Pranešimas išsaugotas ${selectedRecipients.length} gavėjams (el. paštų nėra)`);
      }

      // Update notified_at timestamp
      await supabase
        .from("news_recipients")
        .update({ notified_at: new Date().toISOString() })
        .eq("news_id", newsData.id)
        .in("resident_id", selectedRecipients);

      // Reset form
      setFormData({ subject: "", message: "" });
      setSelectedRecipients([]);
      setPhotos([]);
      setDocuments([]);
      
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Nepavyko išsiųsti pranešimo");
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Siųsti pranešimą
          </CardTitle>
          <CardDescription>
            Sukurkite ir išsiųskite pranešimą pasirinktiems gyventojams arba savininkams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendNotification} className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Tema</Label>
              <Input
                id="subject"
                placeholder="Pranešimo tema..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Pranešimas</Label>
              <Textarea
                id="message"
                rows={8}
                placeholder="Įveskite pranešimo tekstą..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>
            
            {/* Photos */}
            <div className="space-y-2">
              <Label>Nuotraukos (neprivaloma)</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Pridėti nuotrauką
                    </span>
                  </Button>
                </label>
                
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm"
                  >
                    <span className="truncate max-w-[150px]">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Documents */}
            <div className="space-y-2">
              <Label>Dokumentai (neprivaloma)</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <FileUp className="h-4 w-4 mr-2" />
                      Pridėti dokumentą
                    </span>
                  </Button>
                </label>
                
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm"
                  >
                    <span className="truncate max-w-[150px]">{doc.name}</span>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Recipients */}
            <div className="space-y-2">
              <Label>Gavėjai</Label>
              <RecipientSelector
                selectedResidentIds={selectedRecipients}
                onSelectionChange={setSelectedRecipients}
              />
            </div>
            
            {/* Submit */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={sendingNotification || selectedRecipients.length === 0}
                size="lg"
              >
                {sendingNotification ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Siunčiama...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Siųsti pranešimą ({selectedRecipients.length})
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
