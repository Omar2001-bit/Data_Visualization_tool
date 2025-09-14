import React, { useState } from 'react';
import { Palette, Plus, X } from 'lucide-react';

interface PeriodColorRule {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  color: string;
}

interface PeriodColorManagerProps {
  datasetId: string;
  datasetLabel: string;
  periodRules: PeriodColorRule[];
  onUpdateRules: (datasetId: string, rules: PeriodColorRule[]) => void;
}

const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const PeriodColorManager: React.FC<PeriodColorManagerProps> = ({
  datasetId,
  datasetLabel,
  periodRules,
  onUpdateRules
}) => {
  const [newRule, setNewRule] = useState<Partial<PeriodColorRule>>({
    label: '',
    startDate: '',
    endDate: '',
    color: PRESET_COLORS[0]
  });

  const addRule = () => {
    if (newRule.label && newRule.startDate && newRule.endDate && newRule.color) {
      const rule: PeriodColorRule = {
        id: `rule-${Date.now()}`,
        label: newRule.label,
        startDate: newRule.startDate,
        endDate: newRule.endDate,
        color: newRule.color
      };
      
      onUpdateRules(datasetId, [...periodRules, rule]);
      setNewRule({
        label: '',
        startDate: '',
        endDate: '',
        color: PRESET_COLORS[0]
      });
    }
  };

  const removeRule = (ruleId: string) => {
    onUpdateRules(datasetId, periodRules.filter(rule => rule.id !== ruleId));
  };

  const updateRule = (ruleId: string, updates: Partial<PeriodColorRule>) => {
    onUpdateRules(
      datasetId,
      periodRules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-gray-900">
          Period Colors for "{datasetLabel}"
        </h3>
      </div>

      {/* Existing Rules */}
      <div className="space-y-3">
        {periodRules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-6 h-6 rounded border-2 border-gray-300"
              style={{ backgroundColor: rule.color }}
            />
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input
                type="text"
                value={rule.label}
                onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                className="px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="Period label"
              />
              <input
                type="date"
                value={rule.startDate}
                onChange={(e) => updateRule(rule.id, { startDate: e.target.value })}
                className="px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <input
                type="date"
                value={rule.endDate}
                onChange={(e) => updateRule(rule.id, { endDate: e.target.value })}
                className="px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div className="flex gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateRule(rule.id, { color })}
                  className={`w-5 h-5 rounded border-2 ${
                    rule.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={() => removeRule(rule.id)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Rule */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-6 h-6 rounded border-2 border-gray-300"
            style={{ backgroundColor: newRule.color }}
          />
          <div className="flex-1 grid grid-cols-3 gap-2">
            <input
              type="text"
              value={newRule.label || ''}
              onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
              placeholder="Period label (e.g., 'Holiday Season')"
            />
            <input
              type="date"
              value={newRule.startDate || ''}
              onChange={(e) => setNewRule({ ...newRule, startDate: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="date"
              value={newRule.endDate || ''}
              onChange={(e) => setNewRule({ ...newRule, endDate: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewRule({ ...newRule, color })}
                className={`w-5 h-5 rounded border-2 ${
                  newRule.color === color ? 'border-gray-800' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          
          <button
            onClick={addRule}
            disabled={!newRule.label || !newRule.startDate || !newRule.endDate}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Period
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
        💡 <strong>Tip:</strong> Define specific date ranges within your dataset to highlight important periods 
        (e.g., campaigns, holidays, product launches) with custom colors on the chart.
      </div>
    </div>
  );
};