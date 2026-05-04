"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchJson } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function StudentOnboardingModal({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fieldOfStudy: "",
    degreeLevel: "",
    gpa: "",
    preferredCountry: "",
    financialNeed: false,
    goals: "",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        gpa: formData.gpa ? parseFloat(formData.gpa) : null,
      };

      const { res } = await apiFetchJson("/api/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: "Profile updated successfully!" });
        onComplete();
      } else {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Help us personalize your scholarship recommendations. Step {step} of
            2.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fieldOfStudy">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                name="fieldOfStudy"
                value={formData.fieldOfStudy}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="degreeLevel">Degree Level</Label>
              <select
                id="degreeLevel"
                name="degreeLevel"
                value={formData.degreeLevel}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select degree level</option>
                <option value="high_school">High School</option>
                <option value="bachelor">Bachelor's</option>
                <option value="master">Master's</option>
                <option value="phd">PhD</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                name="gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={formData.gpa}
                onChange={handleChange}
                placeholder="e.g. 3.5"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="preferredCountry">Preferred Country</Label>
              <Input
                id="preferredCountry"
                name="preferredCountry"
                value={formData.preferredCountry}
                onChange={handleChange}
                placeholder="e.g. Germany"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goals">Career Goals & Interests</Label>
              <Input
                id="goals"
                name="goals"
                value={formData.goals}
                onChange={handleChange}
                placeholder="e.g. AI research, full funding"
              />
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                id="financialNeed"
                name="financialNeed"
                checked={formData.financialNeed}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="financialNeed"
                className="font-normal cursor-pointer"
              >
                I require financial assistance
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex sm:justify-between items-center w-full">
          <Button variant="ghost" onClick={onClose}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Save Profile"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
