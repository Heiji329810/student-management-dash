import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { CLUB_CATEGORIES } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FOUNDERS = 5;
const MAX_WORDS = 100;

const CREATABLE_CATEGORIES = CLUB_CATEGORIES.filter(
  (cat) => cat !== 'School Official Events'
);

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function CreateClub() {
  const { currentUser, createClub } = useApp();
  const navigate = useNavigate();

  const [founderNames, setFounderNames] = useState(['']);
  const [clubName, setClubName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'student') {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is only accessible to students.
        </p>
      </div>
    );
  }

  const wordCount = countWords(description);

  const updateFounderName = (index: number, value: string) => {
    setFounderNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const addFounder = () => {
    if (founderNames.length < MAX_FOUNDERS) {
      setFounderNames((prev) => [...prev, '']);
    }
  };

  const removeFounder = (index: number) => {
    if (founderNames.length > 1) {
      setFounderNames((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedFounders = founderNames.map((name) => name.trim()).filter(Boolean);
    if (trimmedFounders.length === 0) {
      setError('Please enter at least one founder name.');
      return;
    }
    if (trimmedFounders.length > MAX_FOUNDERS) {
      setError(`You can add up to ${MAX_FOUNDERS} founders.`);
      return;
    }
    if (!clubName.trim()) {
      setError('Please enter a club name.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a brief introduction.');
      return;
    }
    if (wordCount > MAX_WORDS) {
      setError(`Introduction must be no more than ${MAX_WORDS} words.`);
      return;
    }

    const success = createClub({
      founderNames: trimmedFounders,
      name: clubName,
      category,
      description,
    });

    if (success) {
      navigate('/clubs');
    } else {
      setError('Failed to create club. Please try again.');
    }
  };

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Create a Club</h2>
          <p className="text-muted-foreground mt-2">
            Submit a new club for the Clubs & Organizations page
          </p>
        </div>

        <Card className="border-2">
        <CardHeader>
          <CardTitle>New Club Application</CardTitle>
          <CardDescription>
            Fill in the details below. Your club will appear on the Clubs page once submitted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Founder Names
                </label>
                <span className="text-xs text-muted-foreground">
                  {founderNames.length} / {MAX_FOUNDERS}
                </span>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Add the names of club founders (minimum 1, maximum 5)
              </p>

              <div className="space-y-3">
                {founderNames.map((name, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Founder ${index + 1} name`}
                      value={name}
                      onChange={(e) => updateFounderName(index, e.target.value)}
                      className="flex-1"
                    />
                    {founderNames.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeFounder(index)}
                        aria-label={`Remove founder ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {founderNames.length < MAX_FOUNDERS && (
                <Button type="button" variant="outline" size="sm" onClick={addFounder} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Founder
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="clubName" className="text-sm font-medium">
                Club Name
              </label>
              <Input
                id="clubName"
                placeholder="Enter club name"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CREATABLE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="text-sm font-medium">
                  Brief Introduction
                </label>
                <span
                  className={cn(
                    'text-xs',
                    wordCount > MAX_WORDS ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {wordCount} / {MAX_WORDS} words
                </span>
              </div>
              <textarea
                id="description"
                placeholder="Describe your club in no more than 100 words..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-y"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Create Club
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/clubs')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
