import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Send, AlertTriangle, CheckCircle2, X, ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const issueTypes = [
  { value: "doors", label: "Durų problemos" },
  { value: "water", label: "Vandentiekio/kanalizacijos problemos" },
  { value: "walls", label: "Sienų/lubų pažeidimai" },
  { value: "electricity", label: "Elektros problemos" },
  { value: "heating", label: "Šildymo problemos" },
  { value: "elevator", label: "Lifto problemos" },
  { value: "security", label: "Saugumo problemos" },
  { value: "cleanliness", label: "Švaros problemos" },
  { value: "other", label: "Kita" },
];

export default function Tickets() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    apartment: "",
    issueType: "",
    description: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Galima įkelti ne daugiau kaip 5 nuotraukas");
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission - will be replaced with actual Cloud integration
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success("Pranešimas sėkmingai išsiųstas!", {
      description: "Administratorius netrukus susisieks su jumis.",
    });

    // Reset form
    setFormData({ name: "", email: "", apartment: "", issueType: "", description: "" });
    setImages([]);
    previews.forEach(preview => URL.revokeObjectURL(preview));
    setPreviews([]);
    setIsSubmitting(false);
  };

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full mb-4">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Pranešti apie problemą</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Registruoti gedimą
              </h1>
              <p className="text-muted-foreground">
                Užpildykite formą ir mes kuo greičiau išspręsime jūsų problemą
              </p>
            </div>

            <Card className="card-elevated animate-slide-up">
              <CardHeader>
                <CardTitle>Pranešimo forma</CardTitle>
                <CardDescription>
                  Pažymėti laukai (*) yra privalomi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Vardas, Pavardė *</Label>
                      <Input
                        id="name"
                        placeholder="Jonas Jonaitis"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">El. paštas *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jonas@pavyzdys.lt"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apartment">Buto numeris *</Label>
                      <Input
                        id="apartment"
                        placeholder="pvz. 15"
                        value={formData.apartment}
                        onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issueType">Problemos tipas *</Label>
                      <Select
                        value={formData.issueType}
                        onValueChange={(value) => setFormData({ ...formData, issueType: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pasirinkite tipą" />
                        </SelectTrigger>
                        <SelectContent>
                          {issueTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Problemos aprašymas *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detaliai aprašykite problemą..."
                      rows={5}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Nuotraukos (neprivaloma)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id="images"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label htmlFor="images" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium">Įkelti nuotraukas</p>
                          <p className="text-xs text-muted-foreground">
                            Iki 5 nuotraukų (PNG, JPG)
                          </p>
                        </div>
                      </label>
                    </div>

                    {previews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative group aspect-square">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || !formData.name || !formData.email || !formData.apartment || !formData.issueType || !formData.description}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Siunčiama...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Išsiųsti pranešimą
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
