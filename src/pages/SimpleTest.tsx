import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SimpleTest() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple Test</CardTitle>
          <CardDescription>
            This is a simple test component for development purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-4">Test Component</h3>
            <p className="text-muted-foreground mb-4">
              This component is available for testing functionality.
            </p>
            <Button>Test Button</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}