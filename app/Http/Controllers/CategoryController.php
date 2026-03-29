<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Task;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::query()->ordered()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
            'icon' => 'nullable|string|max:50',
        ]);

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    public function show(Category $category)
    {
        return response()->json($category);
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'color' => 'nullable|string|max:50',
            'icon' => 'nullable|string|max:50',
        ]);

        $category->update($validated);

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        Task::query()
            ->where('category_id', $category->getKey())
            ->update(['category_id' => null]);

        $category->delete();

        return response()->json(null, 204);
    }
}
