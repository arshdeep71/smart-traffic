<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Hospital;
use App\Models\HospitalAmbulance;
use App\Models\HospitalEmployee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class HospitalController extends Controller
{
    // ═══════════════════════════════════════════════════════════
    // HOSPITAL CRUD — Admin / Super Admin
    // ═══════════════════════════════════════════════════════════

    // GET /api/hospitals
    public function index(Request $request): JsonResponse
    {
        $query = Hospital::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('city')) {
            $query->where('city', 'like', '%' . $request->city . '%');
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('code', 'like', '%' . $request->search . '%');
            });
        }

        // Hospital admins can only see their own hospital
        $user = $request->user();
        if ($user->role === 'hospital_admin') {
            $query->where('_id', $user->hospital_id);
        }

        $hospitals = $query->orderByDesc('created_at')->get();

        // Attach counts
        $hospitals = $hospitals->map(function ($h) {
            $h->staff_count      = HospitalEmployee::where('hospital_id', (string)$h->_id)->count();
            $h->ambulance_count  = HospitalAmbulance::where('hospital_id', (string)$h->_id)->count();
            $h->available_ambulances = HospitalAmbulance::where('hospital_id', (string)$h->_id)
                                          ->where('status', 'available')->count();
            return $h;
        });

        return response()->json(['success' => true, 'data' => $hospitals]);
    }

    // POST /api/hospitals
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:150',
            'code'                => 'required|string|max:30|unique:mongodb.hospitals,code',
            'address'             => 'required|string',
            'city'                => 'required|string|max:80',
            'state'               => 'required|string|max:80',
            'emergency_contact'   => 'required|string|max:20',
            'hospital_type'       => 'required|in:general,trauma,specialty,clinic',
            'ambulance_capacity'  => 'required|integer|min:1|max:200',
            'email'               => 'required|email|unique:mongodb.hospitals,email',
            'admin_login_id'      => 'required|string|max:80|unique:mongodb.users,email',
            'admin_password'      => 'required|string|min:6',
        ]);

        // Create hospital admin user account
        $adminEmail = $validated['admin_login_id']; // Used as email for login
        $adminUser  = User::create([
            'name'        => $validated['name'] . ' Admin',
            'email'       => $adminEmail,
            'phone'       => $validated['emergency_contact'],
            'password'    => Hash::make($validated['admin_password']),
            'role'        => 'hospital_admin',
            'status'      => 'active',
            'hospital_id' => null, // Will be updated after hospital creation
        ]);

        // Create hospital
        $hospital = Hospital::create([
            'name'                => $validated['name'],
            'code'                => strtoupper($validated['code']),
            'address'             => $validated['address'],
            'city'                => $validated['city'],
            'state'               => $validated['state'],
            'emergency_contact'   => $validated['emergency_contact'],
            'hospital_type'       => $validated['hospital_type'],
            'ambulance_capacity'  => $validated['ambulance_capacity'],
            'email'               => $validated['email'],
            'admin_login_id'      => $adminEmail,
            'admin_user_id'       => (string)$adminUser->_id,
            'admin_password_hint' => $validated['admin_password'], // stored for admin reference
            'status'              => 'active',
        ]);

        // Link hospital_id back to admin user
        $adminUser->update(['hospital_id' => (string)$hospital->_id]);

        AuditLog::record('hospital_created', 'hospital', (string)$hospital->_id);

        return response()->json([
            'success' => true,
            'message' => 'Hospital created successfully.',
            'data'    => [
                'hospital'        => $hospital,
                'admin_login_id'  => $adminEmail,
                'admin_password'  => $validated['admin_password'],
            ],
        ], 201);
    }

    // GET /api/hospitals/{id}
    public function show(string $id): JsonResponse
    {
        $hospital = Hospital::findOrFail($id);
        $user     = auth()->user();

        // Hospital admin can only see their own
        if ($user->role === 'hospital_admin' && (string)$user->hospital_id !== (string)$hospital->_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $hospital->staff      = HospitalEmployee::where('hospital_id', $id)->get();
        $hospital->ambulances = HospitalAmbulance::where('hospital_id', $id)->get();
        $hospital->admin      = User::find($hospital->admin_user_id);

        return response()->json(['success' => true, 'data' => $hospital]);
    }

    // PUT /api/hospitals/{id}
    public function update(Request $request, string $id): JsonResponse
    {
        $hospital = Hospital::findOrFail($id);

        $validated = $request->validate([
            'name'               => 'sometimes|string|max:150',
            'address'            => 'sometimes|string',
            'city'               => 'sometimes|string|max:80',
            'state'              => 'sometimes|string|max:80',
            'emergency_contact'  => 'sometimes|string|max:20',
            'hospital_type'      => 'sometimes|in:general,trauma,specialty,clinic',
            'ambulance_capacity' => 'sometimes|integer|min:1',
            'status'             => 'sometimes|in:active,suspended,inactive',
        ]);

        $hospital->update($validated);
        AuditLog::record('hospital_updated', 'hospital', $id);

        return response()->json(['success' => true, 'message' => 'Hospital updated.', 'data' => $hospital->fresh()]);
    }

    // DELETE /api/hospitals/{id}
    public function destroy(string $id): JsonResponse
    {
        $hospital = Hospital::findOrFail($id);

        // Also clean up related data
        HospitalEmployee::where('hospital_id', $id)->delete();
        HospitalAmbulance::where('hospital_id', $id)->delete();
        if ($hospital->admin_user_id) {
            User::find($hospital->admin_user_id)?->delete();
        }

        AuditLog::record('hospital_deleted', 'hospital', $id);
        $hospital->delete();

        return response()->json(['success' => true, 'message' => 'Hospital and all associated data deleted.']);
    }

    // ═══════════════════════════════════════════════════════════
    // HOSPITAL EMPLOYEES — Hospital Admin
    // ═══════════════════════════════════════════════════════════

    // GET /api/hospitals/{id}/employees
    public function employees(string $id): JsonResponse
    {
        $this->authorizeHospitalAccess($id);
        $employees = HospitalEmployee::where('hospital_id', $id)->get();
        return response()->json(['success' => true, 'data' => $employees]);
    }

    // POST /api/hospitals/{id}/employees
    public function storeEmployee(Request $request, string $id): JsonResponse
    {
        $this->authorizeHospitalAccess($id);
        $hospital = Hospital::findOrFail($id);

        $validated = $request->validate([
            'full_name'  => 'required|string|max:100',
            'role'       => 'required|in:ambulance_driver,emergency_responder,hospital_operator,paramedic,medical_staff',
            'phone'      => 'required|string|max:20',
            'department' => 'required|string|max:80',
            'login_id'   => 'required|string|max:80|unique:mongodb.users,email',
            'password'   => 'required|string|min:6',
        ]);

        // Generate employee ID
        $count      = HospitalEmployee::where('hospital_id', $id)->count() + 1;
        $prefix     = match($validated['role']) {
            'ambulance_driver'    => 'DRV',
            'emergency_responder' => 'RSP',
            'hospital_operator'   => 'OPR',
            'paramedic'           => 'PMD',
            'medical_staff'       => 'MED',
        };
        $hospitalCode = Str::upper(Str::limit(preg_replace('/\s+/', '', $hospital->city), 3, ''));
        $employeeId   = "{$hospitalCode}-{$prefix}-" . str_pad($count, 3, '0', STR_PAD_LEFT);

        // Create user account
        $userRole = match($validated['role']) {
            'ambulance_driver' => 'hospital_driver',
            default            => 'hospital_staff',
        };

        $user = User::create([
            'name'        => $validated['full_name'],
            'email'       => $validated['login_id'],
            'phone'       => $validated['phone'],
            'password'    => Hash::make($validated['password']),
            'role'        => $userRole,
            'status'      => 'active',
            'hospital_id' => $id,
        ]);

        $employee = HospitalEmployee::create([
            'hospital_id'        => $id,
            'user_id'            => (string)$user->_id,
            'employee_id'        => $employeeId,
            'full_name'          => $validated['full_name'],
            'role'               => $validated['role'],
            'phone'              => $validated['phone'],
            'department'         => $validated['department'],
            'login_id'           => $validated['login_id'],
            'shift_status'       => 'off_duty',
            'operational_status' => 'available',
            'account_status'     => 'active',
        ]);

        AuditLog::record('employee_created', 'hospital', $id);

        return response()->json([
            'success' => true,
            'message' => 'Employee account created.',
            'data'    => [
                'employee'  => $employee,
                'login_id'  => $validated['login_id'],
                'password'  => $validated['password'],
                'employee_id' => $employeeId,
            ],
        ], 201);
    }

    // PUT /api/hospitals/{hid}/employees/{eid}
    public function updateEmployee(Request $request, string $hid, string $eid): JsonResponse
    {
        $this->authorizeHospitalAccess($hid);
        $employee = HospitalEmployee::where('hospital_id', $hid)->findOrFail($eid);

        $validated = $request->validate([
            'full_name'          => 'sometimes|string|max:100',
            'phone'              => 'sometimes|string|max:20',
            'department'         => 'sometimes|string|max:80',
            'shift_status'       => 'sometimes|in:on_duty,off_duty,on_break',
            'operational_status' => 'sometimes|in:available,dispatched,offline',
            'account_status'     => 'sometimes|in:active,suspended',
            'assigned_ambulance_id' => 'sometimes|nullable|string',
            'new_password'       => 'sometimes|string|min:6',
        ]);

        if (isset($validated['new_password'])) {
            User::find($employee->user_id)?->update(['password' => Hash::make($validated['new_password'])]);
            unset($validated['new_password']);
        }
        if (isset($validated['account_status'])) {
            User::find($employee->user_id)?->update(['status' => $validated['account_status']]);
        }

        $employee->update($validated);
        AuditLog::record('employee_updated', 'hospital', $hid);

        return response()->json(['success' => true, 'message' => 'Employee updated.', 'data' => $employee->fresh()]);
    }

    // DELETE /api/hospitals/{hid}/employees/{eid}
    public function deleteEmployee(string $hid, string $eid): JsonResponse
    {
        $this->authorizeHospitalAccess($hid);
        $employee = HospitalEmployee::where('hospital_id', $hid)->findOrFail($eid);
        User::find($employee->user_id)?->delete();
        $employee->delete();
        AuditLog::record('employee_deleted', 'hospital', $hid);
        return response()->json(['success' => true, 'message' => 'Employee deleted.']);
    }

    // ═══════════════════════════════════════════════════════════
    // HOSPITAL AMBULANCES — Hospital Admin
    // ═══════════════════════════════════════════════════════════

    // GET /api/hospitals/{id}/ambulances
    public function ambulances(string $id): JsonResponse
    {
        $this->authorizeHospitalAccess($id);
        $ambulances = HospitalAmbulance::where('hospital_id', $id)->get();
        return response()->json(['success' => true, 'data' => $ambulances]);
    }

    // POST /api/hospitals/{id}/ambulances
    public function storeAmbulance(Request $request, string $id): JsonResponse
    {
        $this->authorizeHospitalAccess($id);
        $hospital = Hospital::findOrFail($id);

        $validated = $request->validate([
            'plate_number'        => 'required|string|max:20',
            'assigned_driver_id'  => 'nullable|string',
            'fuel_level'          => 'sometimes|integer|min:0|max:100',
        ]);

        $count       = HospitalAmbulance::where('hospital_id', $id)->count() + 1;
        $hospitalCode = Str::upper(Str::limit(preg_replace('/\s+/', '', $hospital->city), 3, ''));
        $ambulanceId  = "AMB-{$hospitalCode}-" . str_pad($count, 2, '0', STR_PAD_LEFT);

        $ambulance = HospitalAmbulance::create([
            'hospital_id'         => $id,
            'ambulance_id'        => $ambulanceId,
            'plate_number'        => strtoupper($validated['plate_number']),
            'assigned_driver_id'  => $validated['assigned_driver_id'] ?? null,
            'status'              => 'available',
            'gps_status'          => 'active',
            'fuel_level'          => $validated['fuel_level'] ?? 100,
            'health_status'       => 'good',
        ]);

        AuditLog::record('ambulance_created', 'hospital', $id);

        return response()->json(['success' => true, 'message' => 'Ambulance added.', 'data' => $ambulance], 201);
    }

    // PUT /api/hospitals/{hid}/ambulances/{aid}
    public function updateAmbulance(Request $request, string $hid, string $aid): JsonResponse
    {
        $this->authorizeHospitalAccess($hid);
        $ambulance = HospitalAmbulance::where('hospital_id', $hid)->findOrFail($aid);

        $validated = $request->validate([
            'status'             => 'sometimes|in:available,dispatched,maintenance,offline,emergency_active',
            'gps_status'         => 'sometimes|in:active,inactive',
            'fuel_level'         => 'sometimes|integer|min:0|max:100',
            'health_status'      => 'sometimes|in:good,maintenance_due,critical',
            'assigned_driver_id' => 'sometimes|nullable|string',
        ]);

        $ambulance->update($validated);
        AuditLog::record('ambulance_updated', 'hospital', $hid);

        return response()->json(['success' => true, 'message' => 'Ambulance updated.', 'data' => $ambulance->fresh()]);
    }

    // DELETE /api/hospitals/{hid}/ambulances/{aid}
    public function deleteAmbulance(string $hid, string $aid): JsonResponse
    {
        $this->authorizeHospitalAccess($hid);
        $ambulance = HospitalAmbulance::where('hospital_id', $hid)->findOrFail($aid);
        $ambulance->delete();
        AuditLog::record('ambulance_deleted', 'hospital', $hid);
        return response()->json(['success' => true, 'message' => 'Ambulance removed.']);
    }

    // ═══════════════════════════════════════════════════════════
    // HOSPITAL ADMIN DASHBOARD
    // ═══════════════════════════════════════════════════════════

    // GET /api/hospitals/{id}/dashboard
    public function dashboard(string $id): JsonResponse
    {
        $this->authorizeHospitalAccess($id);
        $hospital = Hospital::findOrFail($id);

        $totalAmbulances     = HospitalAmbulance::where('hospital_id', $id)->count();
        $availableAmbulances = HospitalAmbulance::where('hospital_id', $id)->where('status', 'available')->count();
        $dispatchedAmbulances = HospitalAmbulance::where('hospital_id', $id)->where('status', 'dispatched')->count();
        $totalStaff          = HospitalEmployee::where('hospital_id', $id)->count();
        $onDutyStaff         = HospitalEmployee::where('hospital_id', $id)->where('shift_status', 'on_duty')->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'hospital'             => $hospital,
                'total_ambulances'     => $totalAmbulances,
                'available_ambulances' => $availableAmbulances,
                'dispatched_ambulances' => $dispatchedAmbulances,
                'total_staff'          => $totalStaff,
                'on_duty_staff'        => $onDutyStaff,
                'avg_response_time'    => '8.4 min',
                'active_emergencies'   => $dispatchedAmbulances,
            ],
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    // CENTRALIZED ADMIN OVERVIEW
    // ═══════════════════════════════════════════════════════════

    // GET /api/hospitals/overview
    public function overview(): JsonResponse
    {
        $totalHospitals       = Hospital::count();
        $activeHospitals      = Hospital::where('status', 'active')->count();
        $totalAmbulances      = HospitalAmbulance::count();
        $availableAmbulances  = HospitalAmbulance::where('status', 'available')->count();
        $dispatchedAmbulances = HospitalAmbulance::where('status', 'dispatched')->count();
        $totalStaff           = HospitalEmployee::count();
        $onDutyStaff          = HospitalEmployee::where('shift_status', 'on_duty')->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_hospitals'       => $totalHospitals,
                'active_hospitals'      => $activeHospitals,
                'total_ambulances'      => $totalAmbulances,
                'available_ambulances'  => $availableAmbulances,
                'dispatched_ambulances' => $dispatchedAmbulances,
                'total_hospital_staff'  => $totalStaff,
                'on_duty_staff'         => $onDutyStaff,
            ],
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    // HOSPITAL STAFF SELF — for hospital_driver / hospital_staff
    // ═══════════════════════════════════════════════════════════

    // GET /api/hospital/me
    public function staffMe(Request $request): JsonResponse
    {
        $user     = $request->user();
        $employee = HospitalEmployee::where('user_id', (string)$user->_id)->first();
        $hospital = $employee ? Hospital::find($employee->hospital_id) : null;
        $ambulance = null;
        if ($employee && $employee->assigned_ambulance_id) {
            $ambulance = HospitalAmbulance::find($employee->assigned_ambulance_id);
        } else if ($hospital) {
            // For demo/simplicity: automatically grab the first ambulance of this hospital
            $ambulance = HospitalAmbulance::where('hospital_id', (string)$hospital->_id)->first();
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'user'      => $user,
                'employee'  => $employee,
                'hospital'  => $hospital,
                'ambulance' => $ambulance,
            ],
        ]);
    }

    // PUT /api/hospital/me/status
    public function updateMyStatus(Request $request): JsonResponse
    {
        $user     = $request->user();
        $employee = HospitalEmployee::where('user_id', (string)$user->_id)->firstOrFail();

        $validated = $request->validate([
            'shift_status'       => 'sometimes|in:on_duty,off_duty,on_break',
            'operational_status' => 'sometimes|in:available,dispatched,offline',
        ]);

        $employee->update($validated);

        return response()->json(['success' => true, 'message' => 'Status updated.', 'data' => $employee->fresh()]);
    }

    // POST /api/hospital/me/gps — Real-time GPS location update
    public function updateGps(Request $request): JsonResponse
    {
        $user     = $request->user();
        $employee = HospitalEmployee::where('user_id', (string)$user->_id)->first();

        $validated = $request->validate([
            'lat'     => 'required|numeric',
            'lng'     => 'required|numeric',
            'speed'   => 'sometimes|numeric',
            'heading' => 'sometimes|numeric',
            'accuracy'=> 'sometimes|numeric',
        ]);

        // Update ambulance GPS in HospitalAmbulance
        if ($employee && $employee->assigned_ambulance_id) {
            HospitalAmbulance::where('_id', $employee->assigned_ambulance_id)->update([
                'last_lat'       => $validated['lat'],
                'last_lng'       => $validated['lng'],
                'last_speed'     => $validated['speed'] ?? 0,
                'last_heading'   => $validated['heading'] ?? 0,
                'gps_updated_at' => now()->toIso8601String(),
                'gps_status'     => 'active',
            ]);
        }

        if ($employee) {
            $employee->update([
                'last_lat'       => $validated['lat'],
                'last_lng'       => $validated['lng'],
                'gps_updated_at' => now()->toIso8601String(),
            ]);
        }

        return response()->json(['success' => true, 'message' => 'GPS updated.']);
    }

    // POST /api/hospital/me/sos — Driver SOS alert
    public function triggerSos(Request $request): JsonResponse
    {
        $user     = $request->user();
        $employee = HospitalEmployee::where('user_id', (string)$user->_id)->first();

        $validated = $request->validate([
            'reason' => 'required|string|max:200',
            'lat'    => 'sometimes|numeric',
            'lng'    => 'sometimes|numeric',
        ]);

        AuditLog::record('driver_sos_triggered', 'hospital', $employee?->hospital_id ?? null, [], [
            'driver'  => $user->name,
            'reason'  => $validated['reason'],
            'lat'     => $validated['lat'] ?? null,
            'lng'     => $validated['lng'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'SOS alert sent to command center.']);
    }

    // GET /api/hospital/me/emergency — Get active emergency assignment
    public function activeEmergency(Request $request): JsonResponse
    {
        $user     = $request->user();
        $employee = HospitalEmployee::where('user_id', (string)$user->_id)->first();

        // Look for dispatched accidents related to this hospital/driver
        $emergency = null;
        if ($employee) {
            // Check accidents dispatched with this driver
            $accident = \App\Models\Accident::where('assigned_driver_id', (string)$user->_id)
                ->whereIn('status', ['emergency_dispatched', 'driver_accepted', 'en_route', 'near_incident', 'patient_picked', 'reached_hospital'])
                ->orderByDesc('created_at')
                ->first();

            if ($accident) {
                $emergency = $accident;
            }
        }

        return response()->json(['success' => true, 'data' => $emergency]);
    }

    // PUT /api/hospital/me/emergency-stage — Update emergency stage
    public function updateEmergencyStage(Request $request): JsonResponse
    {
        $user     = $request->user();
        $validated = $request->validate([
            'accident_id' => 'required|string',
            'stage'       => 'required|in:driver_accepted,en_route,near_incident,arrived_scene,patient_picked,reached_hospital,completed',
        ]);

        $accident = \App\Models\Accident::findOrFail($validated['accident_id']);

        $statusMap = [
            'driver_accepted'   => 'emergency_dispatched',
            'en_route'          => 'emergency_dispatched',
            'near_incident'     => 'emergency_dispatched',
            'arrived_scene'     => 'emergency_dispatched',
            'patient_picked'    => 'emergency_dispatched',
            'reached_hospital'  => 'emergency_dispatched',
            'completed'         => 'resolved',
        ];

        $accident->update([
            'driver_stage'     => $validated['stage'],
            'status'           => $statusMap[$validated['stage']] ?? $accident->status,
            'driver_id'        => (string)$user->_id,
        ]);

        AuditLog::record('emergency_stage_update', 'hospital', $validated['accident_id'], [], ['stage' => $validated['stage']]);

        return response()->json(['success' => true, 'message' => 'Stage updated.', 'data' => $accident->fresh()]);
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════

    private function authorizeHospitalAccess(string $hospitalId): void
    {
        $user = auth()->user();

        // Super admin and admin have full access
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return;
        }

        // Hospital admin can only access their own hospital
        if ($user->role === 'hospital_admin' && (string)$user->hospital_id === $hospitalId) {
            return;
        }

        abort(403, 'Forbidden: You do not have access to this hospital.');
    }
}
