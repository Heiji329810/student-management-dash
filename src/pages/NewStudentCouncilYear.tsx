import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Student } from '@/types';

const MAX_DEPARTMENTS = 12;

interface DepartmentDraft {
  name: string;
  memberStudentIds: string[];
}

function schoolYearLabel(startYear: number): string {
  return `${startYear}–${startYear + 1}`;
}

function schoolYearOptions(): string[] {
  const start = new Date().getFullYear() - 1;
  return Array.from({ length: 6 }, (_, index) => schoolYearLabel(start + index));
}

function studentMatchesQuery(student: Student, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    student.name.toLowerCase().includes(normalized) ||
    student.studentId.toLowerCase().includes(normalized) ||
    student.email.toLowerCase().includes(normalized)
  );
}

export function NewStudentCouncilYear() {
  const { currentUser, students, studentCouncilTerms, startStudentCouncilTerm } = useApp();
  const navigate = useNavigate();
  const takenYears = new Set(studentCouncilTerms.map((term) => term.schoolYear));
  const yearOptions = schoolYearOptions().filter((year) => !takenYears.has(year));
  const [schoolYear, setSchoolYear] = useState(
    () => yearOptions.find((year) => year === schoolYearLabel(new Date().getFullYear())) ?? yearOptions[0] ?? ''
  );
  const [departments, setDepartments] = useState<DepartmentDraft[]>([
    { name: '', memberStudentIds: [] },
  ]);
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  if (!currentUser) return null;
  if (currentUser.role !== 'founder') {
    return (
      <div className="space-y-3">
        <h2 className="text-3xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">
          Student Council settings are only available to teachers.
        </p>
      </div>
    );
  }

  const setDepartmentCount = (count: number) => {
    setError('');
    const safeCount = Math.min(Math.max(count, 1), MAX_DEPARTMENTS);
    setDepartments((previous) =>
      Array.from({ length: safeCount }, (_, index) => previous[index] ?? { name: '', memberStudentIds: [] })
    );
  };

  const updateDepartment = (index: number, update: Partial<DepartmentDraft>) => {
    setError('');
    setDepartments((previous) =>
      previous.map((department, departmentIndex) =>
        departmentIndex === index ? { ...department, ...update } : department
      )
    );
  };

  const toggleMember = (index: number, studentId: string) => {
    setDepartments((previous) =>
      previous.map((department, departmentIndex) => {
        if (departmentIndex !== index) return department;
        const selected = department.memberStudentIds.includes(studentId);
        return {
          ...department,
          memberStudentIds: selected
            ? department.memberStudentIds.filter((id) => id !== studentId)
            : [...department.memberStudentIds, studentId],
        };
      })
    );
  };

  const confirmCrew = () => {
    setError('');
    if (!schoolYear) {
      setError('Select a school year.');
      return;
    }
    const names = departments.map((department) => department.name.trim());
    if (names.some((name) => !name) || new Set(names).size !== names.length) {
      setError('Give every department a unique name.');
      return;
    }
    if (startStudentCouncilTerm(schoolYear, departments)) {
      navigate('/student-council');
      return;
    }
    setError('That school year could not be added.');
  };

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/student-council">← Back to Student Council</Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">New school year</h2>
        <p className="mt-2 text-muted-foreground">
          Choose the year, set the departments, and select each department’s members.
        </p>
      </div>

      <Card className="border-2">
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="school-year">
                School year
              </label>
              <select
                id="school-year"
                value={schoolYear}
                onChange={(event) => {
                  setError('');
                  setSchoolYear(event.target.value);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {yearOptions.length === 0 ? (
                  <option value="">No school years available</option>
                ) : (
                  yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="department-count">
                Number of departments
              </label>
              <select
                id="department-count"
                value={departments.length}
                onChange={(event) => setDepartmentCount(Number(event.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: MAX_DEPARTMENTS }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {departments.map((department, index) => {
        const query = queries[index] ?? '';
        const selectedStudents = department.memberStudentIds.flatMap((studentId) => {
          const student = students.find((item) => item.id === studentId);
          return student ? [student] : [];
        });
        const matchingStudents = students.filter((student) => studentMatchesQuery(student, query));
        return (
          <Card key={index} className="border-2">
            <CardHeader>
              <CardTitle>Department {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor={`department-name-${index}`}>
                  Department name
                </label>
                <Input
                  id={`department-name-${index}`}
                  value={department.name}
                  onChange={(event) => updateDepartment(index, { name: event.target.value })}
                  placeholder="e.g. Events Department"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Selected members</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No members yet.</span>
                  ) : (
                    selectedStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                        onClick={() => toggleMember(index, student.id)}
                      >
                        {student.name}
                        <span className="text-muted-foreground">{student.studentId}</span>
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {student.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor={`student-search-${index}`}>
                  Student accounts
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`student-search-${index}`}
                    value={query}
                    onChange={(event) =>
                      setQueries((previous) => ({ ...previous, [index]: event.target.value }))
                    }
                    placeholder="Search by name, student ID, or email"
                    className="pl-9"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border">
                  {matchingStudents.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No matching student accounts.</p>
                  ) : (
                    matchingStudents.map((student) => {
                      const selected = department.memberStudentIds.includes(student.id);
                      return (
                        <button
                          key={student.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                          onClick={() => toggleMember(index, student.id)}
                        >
                          <span>
                            <span className="block text-sm font-medium">{student.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {student.studentId} · {student.email}
                            </span>
                          </span>
                          <span className="text-xs font-medium">
                            {selected ? 'Selected' : 'Select account'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={confirmCrew} disabled={!schoolYear}>
        Add this crew
      </Button>
    </div>
  );
}
