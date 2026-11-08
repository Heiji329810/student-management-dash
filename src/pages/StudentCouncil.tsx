import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StudentCouncil() {
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

  const activeTerm = studentCouncilTerms.find((term) => term.status === 'active');
  const pastTerms = studentCouncilTerms.filter((term) => term.status === 'archived');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Student Council</h2>
          <p className="mt-2 text-muted-foreground">
            Configure annual departments and retain each year’s crew history.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/student-council/new">
            <Plus className="h-4 w-4" />
            New school year
          </Link>
        </Button>
      </div>

      {!activeTerm ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No council crew yet.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-5">
          <div>
            <h3 className="text-2xl font-bold">{activeTerm.schoolYear}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeTerm.departments.map((department) => (
                <Badge key={department.id} variant="secondary">
                  {department.name}
                </Badge>
              ))}
            </div>
          </div>

          {activeTerm.departments.map((department) => {
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
                    Current department members
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
        </section>
      )}

      {pastTerms.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xl font-semibold">Past council years</h3>
          {pastTerms.map((term) => (
            <Link
              key={term.id}
              to={`/student-council/years/${term.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="pt-6">
                  <p className="font-semibold">{term.schoolYear}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {term.departments.length} departments ·{' '}
                    {term.departments.reduce(
                      (total, department) => total + department.memberStudentIds.length,
                      0
                    )}{' '}
                    crew members
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
