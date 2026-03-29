<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->unsignedInteger('sort_order')->default(0)->after('icon');
            $table->index(['sort_order', 'name'], 'categories_sort_order_name_index');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropIndex('categories_sort_order_name_index');
            $table->dropColumn('sort_order');
        });
    }
};
