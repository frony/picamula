'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { todosApi, type TodoItem } from '@/lib/api';

export default function TripChecklistPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const response = await todosApi.getAll();
      setTodos(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      const response = await todosApi.create({ title: newItemTitle });
      setTodos([...todos, response.data]);
      setNewItemTitle('');
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const response = await todosApi.toggle(id);
      setTodos(todos.map(todo => 
        todo.id === id ? response.data : todo
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await todosApi.delete(id);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Are you sure you want to reset all items to PENDING?')) return;

    try {
      const response = await todosApi.resetAll();
      setTodos(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to reset items');
    }
  };

  const completedCount = todos.filter(todo => todo.status === 'completed').length;
  const totalCount = todos.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trip Preparation Checklist</h1>
              <p className="text-gray-600 mt-1">Your reusable checklist for every trip</p>
            </div>
            <button onClick={() => router.push('/trips')} className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Trips
            </button>
          </div>

          {totalCount > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{completedCount} of {totalCount} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-sm">Dismiss</button>
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" /> Add Item
          </button>
          {totalCount > 0 && (
            <button onClick={handleResetAll} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <RotateCcw className="w-5 h-5" /> Reset All to Pending
            </button>
          )}
        </div>

        {isAdding && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <form onSubmit={handleAddItem}>
              <div className="flex gap-3">
                <input type="text" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="Enter todo item..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" autoFocus />
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Add</button>
                <button type="button" onClick={() => { setIsAdding(false); setNewItemTitle(''); }} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm">
          {todos.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg mb-2">No items in your checklist yet</p>
              <p className="text-sm">Click "Add Item" to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {todos.map((todo) => (
                <li key={todo.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleToggle(todo.id)} className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${todo.status === 'completed' ? 'bg-green-600 border-green-600' : 'border-gray-300 hover:border-green-600'}`}>
                      {todo.status === 'completed' && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <span className={`flex-1 text-lg ${todo.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{todo.title}</span>
                    <button onClick={() => handleDelete(todo.id)} className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete item">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
