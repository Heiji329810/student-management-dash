import { Link, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useApp } from '@/context/useApp';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StudentCouncilYear() {
  const { termId } = useParams<{ termId: string }>();
  const { currentUser, students, studentCouncilTerms } = useApp();

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

  const term = studentCouncilTerms.find((item) => item.id === termId);
  if (!term) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Council year not found</h2>
        <Button asChild variant="outline">
          <Link to="/student-council">← Back to Student Council</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/student-council">← Back to Student Council</Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{term.schoolYear}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {term.departments.map((department) => (
            <Badge key={department.id} variant="secondary">
              {department.name}
            </Badge>
          ))}
        </div>
      </div>

      {term.departments.map((department) => {
        const departmentMembers = department.memberStudentIds.flatMap((studentId) => {
          const student = students.find((item) => item.id === studentId);
          return student ? [student] : [];
        });
        return (
          <Card key={department.id} className="border-2">
            <CardHeader>
              <CardTitle>{department.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" />
                Department members
              </p>
              {departmentMembers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {departmentMembers.map((member) => (
                    <div key={member.id} className="rounded-md border px-3 py-2 text-sm">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.studentId} · {member.email}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
