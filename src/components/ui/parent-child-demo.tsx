import React, { useState } from 'react';
import { 
  ParentChildBuilder, 
  ParentChildData,
  createFTEBreakdownData,
  createCompensationBreakdownData,
  createTimeAllocationData
} from './parent-child-builder';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Button } from './button';
import { RefreshCw } from 'lucide-react';

export function ParentChildDemo() {
  // FTE Breakdown Example
  const [fteData, setFteData] = useState<ParentChildData>(
    createFTEBreakdownData(1.0)
  );

  // Compensation Breakdown Example
  const [compensationData, setCompensationData] = useState<ParentChildData>(
    createCompensationBreakdownData(450000)
  );

  // Time Allocation Example
  const [timeData, setTimeData] = useState<ParentChildData>(
    createTimeAllocationData(40)
  );

  // Custom Example
  const [customData, setCustomData] = useState<ParentChildData>({
    parentLabel: "CME Budget",
    parentValue: 5000,
    parentUnit: "$",
    children: [
      { id: "conferences", label: "Conferences", value: 3000 },
      { id: "courses", label: "Online Courses", value: 1500 },
      { id: "books", label: "Books & Materials", value: 500 }
    ],
    precision: 0
  });

  const resetData = () => {
    setFteData(createFTEBreakdownData(1.0));
    setCompensationData(createCompensationBreakdownData(450000));
    setTimeData(createTimeAllocationData(40));
    setCustomData({
      parentLabel: "CME Budget",
      parentValue: 5000,
      parentUnit: "$",
      children: [
        { id: "conferences", label: "Conferences", value: 3000 },
        { id: "courses", label: "Online Courses", value: 1500 },
        { id: "books", label: "Books & Materials", value: 500 }
      ],
      precision: 0
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parent-Child Builder Demo</h1>
          <p className="text-gray-600 mt-1">
            Universal component for managing hierarchical data structures
          </p>
        </div>
        <Button onClick={resetData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </div>

      <Tabs defaultValue="fte" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fte">FTE Breakdown</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="time">Time Allocation</TabsTrigger>
          <TabsTrigger value="custom">Custom (CME)</TabsTrigger>
        </TabsList>

        <TabsContent value="fte" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                FTE Breakdown Example
                <Badge variant="secondary">Healthcare</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Manage how a provider's Full-Time Equivalent is allocated across different activities.
              </p>
            </CardHeader>
            <CardContent>
              <ParentChildBuilder
                data={fteData}
                onChange={setFteData}
                placeholder="Enter activity name..."
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Generated Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{JSON.stringify(fteData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Compensation Breakdown Example
                <Badge variant="secondary">Financial</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Break down total compensation into base salary, bonuses, and incentives.
              </p>
            </CardHeader>
            <CardContent>
              <ParentChildBuilder
                data={compensationData}
                onChange={setCompensationData}
                placeholder="Enter compensation component..."
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Generated Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{JSON.stringify(compensationData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Time Allocation Example
                <Badge variant="secondary">Scheduling</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Allocate weekly hours across different types of work activities.
              </p>
            </CardHeader>
            <CardContent>
              <ParentChildBuilder
                data={timeData}
                onChange={setTimeData}
                placeholder="Enter time category..."
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Generated Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{JSON.stringify(timeData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Custom Example: CME Budget
                <Badge variant="secondary">Benefits</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Allocate continuing medical education budget across different categories.
              </p>
            </CardHeader>
            <CardContent>
              <ParentChildBuilder
                data={customData}
                onChange={setCustomData}
                placeholder="Enter budget category..."
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Generated Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{JSON.stringify(customData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Key Features</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-700">✨ Simple & Intuitive</h4>
              <p className="text-blue-600">Drag & drop reordering, inline editing</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700">🎯 Smart Validation</h4>
              <p className="text-blue-600">Auto-balance, allocation warnings</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700">🔧 Flexible</h4>
              <p className="text-blue-600">Works with any parent-child data structure</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700">💎 Beautiful</h4>
              <p className="text-blue-600">Clean design, proper spacing, visual feedback</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 