<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            'board.create',
            'board.edit',
            'board.delete',
            'board.view',
            'column.create',
            'column.edit',
            'column.delete',
            'card.create',
            'card.edit',
            'card.delete',
            'card.move',
            'comment.create',
            'comment.edit.own',
            'comment.edit.any',
            'image.upload',
            'image.delete',
            'user.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles and assign permissions
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->syncPermissions(Permission::all());

        $memberRole = Role::firstOrCreate(['name' => 'member']);
        $memberRole->syncPermissions([
            'board.view',
            'card.create',
            'card.edit',
            'card.delete',
            'card.move',
            'comment.create',
            'comment.edit.own',
            'image.upload',
            'image.delete',
        ]);

        $viewerRole = Role::firstOrCreate(['name' => 'viewer']);
        $viewerRole->syncPermissions([
            'board.view',
            'comment.create',
            'comment.edit.own',
        ]);
    }
}
