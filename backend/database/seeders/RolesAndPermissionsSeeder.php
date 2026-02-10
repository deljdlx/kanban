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
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        $memberRole = Role::create(['name' => 'member']);
        $memberRole->givePermissionTo([
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

        $viewerRole = Role::create(['name' => 'viewer']);
        $viewerRole->givePermissionTo([
            'board.view',
            'comment.create',
            'comment.edit.own',
        ]);
    }
}
