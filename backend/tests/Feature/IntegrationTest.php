<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed database
        $this->artisan('db:seed');
    }

    public function test_complete_workflow(): void
    {
        // 1. Login as admin
        $response = $this->postJson('/api/login', [
            'email' => 'admin@kanban.local',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
        $token = $response->json('token');

        // 2. Get current user info
        $response = $this->withToken($token)
            ->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJsonPath('email', 'admin@kanban.local');

        // 3. Create a new board
        $response = $this->withToken($token)
            ->postJson('/api/boards', [
                'name' => 'My Project Board',
                'data' => [
                    'columns' => [],
                ],
            ]);

        $response->assertStatus(201);
        $boardId = $response->json('id');

        // 4. Push operations to add columns
        $response = $this->withToken($token)
            ->postJson("/api/boards/{$boardId}/ops", [
                'ops' => [
                    [
                        'type' => 'column:add',
                        'column' => [
                            'id' => 'col-todo',
                            'title' => 'To Do',
                            'cards' => [],
                        ],
                        'index' => 0,
                    ],
                    [
                        'type' => 'column:add',
                        'column' => [
                            'id' => 'col-doing',
                            'title' => 'In Progress',
                            'cards' => [],
                        ],
                        'index' => 1,
                    ],
                    [
                        'type' => 'column:add',
                        'column' => [
                            'id' => 'col-done',
                            'title' => 'Done',
                            'cards' => [],
                        ],
                        'index' => 2,
                    ],
                ],
                'clientRevision' => 0,
            ]);

        $response->assertStatus(200)
            ->assertJson(['serverRevision' => 1]);

        // 5. Pull operations to verify
        $response = $this->withToken($token)
            ->getJson("/api/boards/{$boardId}/ops?since=0");

        $response->assertStatus(200)
            ->assertJsonStructure(['ops', 'serverRevision']);

        // 6. Get board snapshot
        $response = $this->withToken($token)
            ->getJson("/api/boards/{$boardId}");

        $response->assertStatus(200)
            ->assertJsonPath('name', 'My Project Board')
            ->assertJsonPath('serverRevision', 1);

        $data = $response->json('data');
        $this->assertCount(3, $data['columns']);
        $this->assertEquals('To Do', $data['columns'][0]['title']);
        $this->assertEquals('In Progress', $data['columns'][1]['title']);
        $this->assertEquals('Done', $data['columns'][2]['title']);

        // 7. Get taxonomies
        $response = $this->withToken($token)
            ->getJson('/api/taxonomies');

        $response->assertStatus(200)
            ->assertJsonCount(2); // type and priority

        // 8. List all boards
        $response = $this->withToken($token)
            ->getJson('/api/boards');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name'],
                ],
            ]);

        // 9. Logout
        $response = $this->withToken($token)
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Logged out successfully']);
    }

    public function test_permission_enforcement(): void
    {
        // Login as viewer
        $response = $this->postJson('/api/login', [
            'email' => 'viewer@kanban.local',
            'password' => 'password',
        ]);

        $token = $response->json('token');

        // Viewer can see boards
        $response = $this->withToken($token)
            ->getJson('/api/boards');
        $response->assertStatus(200);

        // Viewer cannot create boards
        $response = $this->withToken($token)
            ->postJson('/api/boards', [
                'name' => 'Test Board',
            ]);
        $response->assertStatus(403);

        // Viewer cannot manage users
        $response = $this->withToken($token)
            ->getJson('/api/users');
        $response->assertStatus(403);
    }
}
