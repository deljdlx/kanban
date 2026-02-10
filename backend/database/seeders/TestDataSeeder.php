<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Database\Seeder;

class TestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@kanban.local',
            'password' => bcrypt('password'),
            'initials' => 'AD',
            'color' => '#3b82f6',
        ]);
        $admin->assignRole('admin');

        // Create member user
        $member = User::create([
            'name' => 'Member User',
            'email' => 'member@kanban.local',
            'password' => bcrypt('password'),
            'initials' => 'ME',
            'color' => '#10b981',
        ]);
        $member->assignRole('member');

        // Create viewer user
        $viewer = User::create([
            'name' => 'Viewer User',
            'email' => 'viewer@kanban.local',
            'password' => bcrypt('password'),
            'initials' => 'VI',
            'color' => '#f59e0b',
        ]);
        $viewer->assignRole('viewer');

        // Create sample board
        Board::create([
            'name' => 'Sample Kanban Board',
            'data' => [
                'columns' => [
                    [
                        'id' => 'col-1',
                        'title' => 'To Do',
                        'cards' => [],
                    ],
                    [
                        'id' => 'col-2',
                        'title' => 'In Progress',
                        'cards' => [],
                    ],
                    [
                        'id' => 'col-3',
                        'title' => 'Done',
                        'cards' => [],
                    ],
                ],
            ],
            'server_revision' => 0,
        ]);

        // Create sample taxonomies
        Taxonomy::create([
            'key' => 'type',
            'label' => 'Type',
            'terms' => [
                'bug' => [
                    'label' => 'Bug',
                    'color' => '#ef4444',
                ],
                'feature' => [
                    'label' => 'Feature',
                    'color' => '#3b82f6',
                ],
                'task' => [
                    'label' => 'Task',
                    'color' => '#10b981',
                ],
            ],
        ]);

        Taxonomy::create([
            'key' => 'priority',
            'label' => 'Priority',
            'terms' => [
                'low' => [
                    'label' => 'Low',
                    'color' => '#6b7280',
                ],
                'medium' => [
                    'label' => 'Medium',
                    'color' => '#f59e0b',
                ],
                'high' => [
                    'label' => 'High',
                    'color' => '#ef4444',
                ],
            ],
        ]);
    }
}
