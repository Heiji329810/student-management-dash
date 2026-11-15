import { useState } from 'react';
import {
  CLUB_INTRODUCTION_MAX_CHARACTERS,
  CLUB_INTRODUCTION_LIMIT_ERROR,
  countClubIntroductionCharacters,
} from '@student-dash/shared/clubIntroduction';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { CLUB_CATEGORIES } from '@/data/categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, CheckCircle2, Plus, School, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FOUNDERS = 5;

const CREATABLE_CATEGORIES = CLUB_CATEGORIES.filter(
  (cat) => cat !== 'School Official Events'
);

export function CreateClub() {
  const { currentUser, clubApplications, submitClubApplication } = useApp();
  const navigate = useNavigate();

  const [founderNames, setFounderNames] = useState(['']);
  const [clubName, setClubName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [wantsSchoolOfficial, setWantsSchoolOfficial] = useState(false);
  const [managingTeacherName, setManagingTeacherName] = useState('');
  const [submitted, setSubmitted] = useState(false);
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

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="border-2">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            <h2 className="mt-4 text-2xl font-bold">Application submitted</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Your club has not been published yet. A managing teacher will review the
              complete application, and you will receive a notification after a decision.
            </p>
            {wantsSchoolOfficial && (
              <div className="mt-3 space-y-1 rounded-md bg-muted px-4 py-2 text-sm">
                <p>You requested School Official Club status.</p>
                <p>
                  <span>Teacher in charge of managing the club</span>
                  {': '}
                  {managingTeacherName}
                </p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button onClick={() => setSubmitted(false)}>Submit another application</Button>
              <Button variant="outline" onClick={() => navigate('/clubs')}>
                Browse clubs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const characterCount = countClubIntroductionCharacters(description);
  const myApplications = clubApplications.filter(
    (application) => application.applicantUserId === currentUser.id
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (characterCount > CLUB_INTRODUCTION_MAX_CHARACTERS) {
      setError(CLUB_INTRODUCTION_LIMIT_ERROR);
      return;
    }
    if (wantsSchoolOfficial && !managingTeacherName.trim()) {
      setError('Please enter the name of the teacher in charge of managing the club.');
      return;
    }

    const success = await submitClubApplication({
      founderNames: trimmedFounders,
      name: clubName,
      category,
      description,
      wantsSchoolOfficial,
      managingTeacherName: wantsSchoolOfficial ? managingTeacherName.trim() : undefined,
    });

    if (success) {
      setSubmitted(true);
    } else {
      setError('Unable to submit this application. You may already have an active application with this club name.');
    }
  };

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create a Club</h2>
            <p className="text-muted-foreground mt-2">
              Submit a club application for teacher review
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="ml-auto">
                My applications
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader className="pr-6">
                <DialogTitle>My Applications</DialogTitle>
                <DialogDescription>
                  Teacher decisions and comments for your submitted clubs
                </DialogDescription>
              </DialogHeader>
              <div className="min-w-0 space-y-3 break-words">
                {myApplications.length === 0 && (
                  <p className="py-4 text-sm text-muted-foreground">
                    You haven't submitted any club applications yet.
                  </p>
                )}
                {myApplications.map((application) => (
                  <div key={application.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{application.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {new Date(application.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {application.status.replaceAll('_', ' ')}
                        </Badge>
                        {application.wantsSchoolOfficial && (
                          <Badge>School Official</Badge>
                        )}
                      </div>
                    </div>
                    {application.managingTeacherName && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        <span>Teacher in charge of managing the club</span>
                        {': '}
                        {application.managingTeacherName}
                      </p>
                    )}
                    {application.teacherComment && (
                      <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        Teacher comment: {application.teacherComment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-2">
        <CardHeader>
          <CardTitle>New Club Application</CardTitle>
          <CardDescription>
            Fill in the details below. Your club will be published only after approval.
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

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <School className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Do you want to apply to become a School Official Club?
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    If a teacher approves this request, the club will be established
                    as a School Official Club.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={wantsSchoolOfficial}
                  className={cn(
                    wantsSchoolOfficial &&
                      'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                  )}
                  onClick={() => setWantsSchoolOfficial(true)}
                >
                  {wantsSchoolOfficial && <Check className="h-4 w-4" />}
                  Yes, apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={!wantsSchoolOfficial}
                  className={cn(
                    !wantsSchoolOfficial &&
                      'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                  )}
                  onClick={() => setWantsSchoolOfficial(false)}
                >
                  {!wantsSchoolOfficial && <Check className="h-4 w-4" />}
                  No, ordinary club
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {wantsSchoolOfficial
                  ? 'This application will request School Official Club status.'
                  : 'This application will be for an ordinary club.'}
              </p>
              {wantsSchoolOfficial && (
                <div className="space-y-2">
                  <label htmlFor="managingTeacherName" className="text-sm font-medium">
                    Teacher in charge of managing the club
                  </label>
                  <Input
                    id="managingTeacherName"
                    value={managingTeacherName}
                    onChange={(event) => setManagingTeacherName(event.target.value)}
                    placeholder="Enter the teacher's name"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="text-sm font-medium">
                  Brief Introduction
                </label>
                <span
                  className={cn(
                    'text-xs',
                    characterCount > CLUB_INTRODUCTION_MAX_CHARACTERS ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {`${characterCount} / ${CLUB_INTRODUCTION_MAX_CHARACTERS} characters`}
                </span>
              </div>
              <textarea
                id="description"
                placeholder="Describe your club in no more than 100 characters..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-describedby="club-introduction-help"
                aria-invalid={characterCount > CLUB_INTRODUCTION_MAX_CHARACTERS}
                rows={5}
                className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-y"
              />
              <p id="club-introduction-help" className="text-xs text-muted-foreground">
                Maximum 100 characters, including spaces.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Submit Application
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
