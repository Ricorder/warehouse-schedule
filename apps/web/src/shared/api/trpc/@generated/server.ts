import { initTRPC } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";

const t = initTRPC.create({ transformer: superjson });
const publicProcedure = t.procedure;

const appRouter = t.router({
  auth: t.router({
    getMe: publicProcedure.output(z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.email(),
      role: z.enum(['admin', 'worker']),
    })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    signUp: publicProcedure.input(z.object({
      name: z.string().min(3, 'Укажите имя и фамилию').max(255),
      email: z.email(),
      password: z.string().min(8, 'Минимум 8 символов').max(100),
      /**
       * Роль указывается при регистрации, чтобы проверяющий мог завести
       * и администратора, и сборщика без доступа к БД.
       */
      role: z.enum(['admin', 'worker']),
    })).output(z.object({
      user: z.object({
        id: z.uuid(),
        name: z.string(),
        email: z.email(),
        role: z.enum(['admin', 'worker']),
      }),
      accessToken: z.string(),
      expiresIn: z.number(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    signIn: publicProcedure.input(z.object({
      email: z.email(),
      password: z.string().min(1, 'Введите пароль'),
    })).output(z.object({
      user: z.object({
        id: z.uuid(),
        name: z.string(),
        email: z.email(),
        role: z.enum(['admin', 'worker']),
      }),
      accessToken: z.string(),
      expiresIn: z.number(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  employee: t.router({
    getEmployees: publicProcedure.input(z.object({
      role: z.enum(['admin', 'worker']).optional(),
      /** Поиск по фамилии/имени (подстрока, регистронезависимо). */
      search: z.string().optional(),
    })).output(z.array(z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.email(),
      role: z.enum(['admin', 'worker']),
    }))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    getAssignable: publicProcedure.input(z.object({
      shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      shiftType: z.enum(['day', 'night']),
      search: z.string().optional(),
    })).output(z.array(z.object({
      id: z.uuid(),
      name: z.string(),
      role: z.enum(['admin', 'worker']),
      /** Уже назначен на какой-то станок в эту дату и смену. */
      busy: z.boolean(),
      busyMachineId: z.uuid().nullable(),
      busyMachineName: z.string().nullable(),
    }))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  machine: t.router({
    getMachines: publicProcedure.input(z.object({
      type: z.enum(['machine', 'table']).optional(),
    })).output(z.array(z.object({
      id: z.uuid(),
      name: z.string(),
      type: z.enum(['machine', 'table']),
    }))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createMachine: publicProcedure.input(z.object({
      name: z.string().min(1, 'Название обязательно').max(255),
      type: z.enum(['machine', 'table']),
    })).output(z.object({
      id: z.uuid(),
      name: z.string(),
      type: z.enum(['machine', 'table']),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  log: t.router({
    getLogs: publicProcedure.input(z.object({
      employeeId: z.uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    })).output(z.array(z.object({
      id: z.uuid(),
      userId: z.uuid(),
      userName: z.string(),
      targetEmployeeId: z.uuid().nullable(),
      targetEmployeeName: z.string().nullable(),
      sessionId: z.uuid().nullable(),
      assignmentId: z.uuid().nullable(),
      action: z.enum([
        'start',
        'pause',
        'resume',
        'stop',
        'comment',
        'admin_edit',
        'admin_assign',
        'admin_unassign',
      ]),
      timestamp: z.string(),
      /** Сырые детали в виде JSON-строки. */
      details: z.string().nullable(),
      /** Человекочитаемое описание, собранное на сервере. */
      description: z.string(),
    }))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  pause: t.router({
    getPresets: publicProcedure.output(z.array(z.object({
      reason: z.string(),
      isProductive: z.boolean(),
    }))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    startPause: publicProcedure.input(z.object({
      sessionId: z.uuid(),
      /** ТЗ: «Сотрудник может поставить себя на паузу только с комментарием». */
      reason: z.string().min(1, 'Укажите причину паузы').max(255),
      /** Продуктивная пауза («вызвали помочь») засчитывается в рабочее время. */
      isProductive: z.boolean().optional(),
    })).output(z.object({
      id: z.uuid(),
      sessionId: z.uuid(),
      startedAt: z.string(),
      endedAt: z.string().nullable(),
      reason: z.string(),
      isProductive: z.boolean(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    endPause: publicProcedure.input(z.object({
      pauseId: z.uuid(),
    })).output(z.object({
      id: z.uuid(),
      sessionId: z.uuid(),
      startedAt: z.string(),
      endedAt: z.string().nullable(),
      reason: z.string(),
      isProductive: z.boolean(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  shift: t.router({
    getSchedule: publicProcedure.input(z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      /** Фильтр по смене; не задан — показываем и день, и ночь. */
      shiftType: z.enum(['day', 'night']).optional(),
      /** Переключатель «Станки | Столы». */
      machineType: z.enum(['machine', 'table']).optional(),
      /** Фильтр по фамилии сотрудника. */
      search: z.string().optional(),
      /** «Только занятые» — скрыть строки без назначений. */
      onlyBusy: z.boolean().optional(),
    })).output(z.object({
      dates: z.array(z.string()),
      rows: z.array(
        z.object({
          machineId: z.uuid(),
          machineName: z.string(),
          machineType: z.enum(['machine', 'table']),
          shiftType: z.enum(['day', 'night']),
          cells: z.array(
            z.object({
              date: z.string(),
              entries: z.array(
                z.object({
                  assignmentId: z.uuid(),
                  employeeId: z.uuid(),
                  employeeName: z.string(),
                  sessionId: z.uuid().nullable(),
                  sessionStartedAt: z.string().nullable(),
                  sessionStoppedAt: z.string().nullable(),
                  status: z.enum(['idle', 'working', 'paused', 'stopped']),
                  workMs: z.number(),
                  pauseMs: z.number(),
                  totalMs: z.number(),
                }),
              ),
            }),
          ),
        }),
      ),
      totals: z.array(
        z.object({
          employeeId: z.uuid(),
          employeeName: z.string(),
          workMs: z.number(),
          pauseMs: z.number(),
          totalMs: z.number(),
          shiftsCount: z.number(),
        }),
      ),
      maxPerMachine: z.number(),
    })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    assignEmployee: publicProcedure.input(z.object({
      employeeId: z.uuid(),
      machineId: z.uuid(),
      shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      shiftType: z.enum(['day', 'night']),
    })).output(z.object({
      id: z.uuid(),
      employeeId: z.uuid(),
      machineId: z.uuid(),
      shiftDate: z.string(),
      shiftType: z.enum(['day', 'night']),
      createdAt: z.string(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    unassignEmployee: publicProcedure.input(z.object({
      assignmentId: z.uuid(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  session: t.router({
    getCurrent: publicProcedure.output(z.object({
      employee: z.object({
        id: z.uuid(),
        name: z.string(),
      }),
      assignment: z.object({
        id: z.uuid(),
        shiftDate: z.string(),
        shiftType: z.enum(['day', 'night']),
        machineId: z.uuid(),
        machineName: z.string(),
        machineType: z.enum(['machine', 'table']),
      }),
      session: z
        .object({
          id: z.uuid(),
          assignmentId: z.uuid(),
          startedAt: z.string(),
          stoppedAt: z.string().nullable(),
        })
        .nullable(),
      status: z.enum(['idle', 'working', 'paused', 'stopped']),
      pauses: z.array(
        z.object({
          id: z.uuid(),
          sessionId: z.uuid(),
          startedAt: z.string(),
          endedAt: z.string().nullable(),
          reason: z.string(),
          isProductive: z.boolean(),
        }),
      ),
      activePause: z
        .object({
          id: z.uuid(),
          sessionId: z.uuid(),
          startedAt: z.string(),
          endedAt: z.string().nullable(),
          reason: z.string(),
          isProductive: z.boolean(),
        })
        .nullable(),
      logs: z.array(
        z.object({
          id: z.uuid(),
          userId: z.uuid(),
          userName: z.string(),
          targetEmployeeId: z.uuid().nullable(),
          targetEmployeeName: z.string().nullable(),
          sessionId: z.uuid().nullable(),
          assignmentId: z.uuid().nullable(),
          action: z.enum([
            'start',
            'pause',
            'resume',
            'stop',
            'comment',
            'admin_edit',
            'admin_assign',
            'admin_unassign',
          ]),
          timestamp: z.string(),
          details: z.string().nullable(),
          description: z.string(),
        }),
      ),
      durations: z.object({
        workMs: z.number(),
        pauseMs: z.number(),
        productivePauseMs: z.number(),
        totalMs: z.number(),
      }),
      /** Время сервера — чтобы таймер на клиенте не расходился из-за часов пользователя. */
      serverTime: z.string(),
    }).nullable()).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    getMyHistory: publicProcedure.input(z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).output(z.object({
      items: z.array(
        z.object({
          assignmentId: z.uuid(),
          employeeId: z.uuid(),
          employeeName: z.string(),
          sessionId: z.uuid().nullable(),
          sessionStartedAt: z.string().nullable(),
          sessionStoppedAt: z.string().nullable(),
          status: z.enum(['idle', 'working', 'paused', 'stopped']),
          workMs: z.number(),
          pauseMs: z.number(),
          totalMs: z.number(),
          shiftDate: z.string(),
          shiftType: z.enum(['day', 'night']),
          machineName: z.string(),
          machineType: z.enum(['machine', 'table']),
        }),
      ),
      summary: z.object({
        workMs: z.number(),
        pauseMs: z.number(),
        totalMs: z.number(),
      }),
    })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    startSession: publicProcedure.input(z.object({
      machineId: z.uuid(),
      shiftType: z.enum(['day', 'night']),
      /** По умолчанию — сегодня. */
      shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })).output(z.object({
      employee: z.object({
        id: z.uuid(),
        name: z.string(),
      }),
      assignment: z.object({
        id: z.uuid(),
        shiftDate: z.string(),
        shiftType: z.enum(['day', 'night']),
        machineId: z.uuid(),
        machineName: z.string(),
        machineType: z.enum(['machine', 'table']),
      }),
      session: z
        .object({
          id: z.uuid(),
          assignmentId: z.uuid(),
          startedAt: z.string(),
          stoppedAt: z.string().nullable(),
        })
        .nullable(),
      status: z.enum(['idle', 'working', 'paused', 'stopped']),
      pauses: z.array(
        z.object({
          id: z.uuid(),
          sessionId: z.uuid(),
          startedAt: z.string(),
          endedAt: z.string().nullable(),
          reason: z.string(),
          isProductive: z.boolean(),
        }),
      ),
      activePause: z
        .object({
          id: z.uuid(),
          sessionId: z.uuid(),
          startedAt: z.string(),
          endedAt: z.string().nullable(),
          reason: z.string(),
          isProductive: z.boolean(),
        })
        .nullable(),
      logs: z.array(
        z.object({
          id: z.uuid(),
          userId: z.uuid(),
          userName: z.string(),
          targetEmployeeId: z.uuid().nullable(),
          targetEmployeeName: z.string().nullable(),
          sessionId: z.uuid().nullable(),
          assignmentId: z.uuid().nullable(),
          action: z.enum([
            'start',
            'pause',
            'resume',
            'stop',
            'comment',
            'admin_edit',
            'admin_assign',
            'admin_unassign',
          ]),
          timestamp: z.string(),
          details: z.string().nullable(),
          description: z.string(),
        }),
      ),
      durations: z.object({
        workMs: z.number(),
        pauseMs: z.number(),
        productivePauseMs: z.number(),
        totalMs: z.number(),
      }),
      /** Время сервера — чтобы таймер на клиенте не расходился из-за часов пользователя. */
      serverTime: z.string(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    stopSession: publicProcedure.input(z.object({
      sessionId: z.uuid(),
    })).output(z.object({
      employee: z.object({
        id: z.uuid(),
        name: z.string(),
      }),
      assignment: z.object({
        id: z.uuid(),
        shiftDate: z.string(),
        shiftType: z.enum(['day', 'night']),
        machineId: z.uuid(),
        machineName: z.string(),
        machineType: z.enum(['machine', 'table']),
      }),
      session: z
        .object({
          id: z.uuid(),
          assignmentId: z.uuid(),
          startedAt: z.string(),
          stoppedAt: z.string().nullable(),
        })
        .nullable(),
      status: z.enum(['idle', 'working', 'paused', 'stopped']),
      pauses: z.array(
        z.object({
          id: z.uuid(),
          sessionId: z.uuid(),
          startedAt: z.string(),
          endedAt: z.string().nullable(),
          reason: z.string(),
          isProductive: z.boolean(),
        }),
      ),
      activePause: z
        .object({
          id: z.uuid(),
          sessionId: z.uuid(),
          startedAt: z.string(),
          endedAt: z.string().nullable(),
          reason: z.string(),
          isProductive: z.boolean(),
        })
        .nullable(),
      logs: z.array(
        z.object({
          id: z.uuid(),
          userId: z.uuid(),
          userName: z.string(),
          targetEmployeeId: z.uuid().nullable(),
          targetEmployeeName: z.string().nullable(),
          sessionId: z.uuid().nullable(),
          assignmentId: z.uuid().nullable(),
          action: z.enum([
            'start',
            'pause',
            'resume',
            'stop',
            'comment',
            'admin_edit',
            'admin_assign',
            'admin_unassign',
          ]),
          timestamp: z.string(),
          details: z.string().nullable(),
          description: z.string(),
        }),
      ),
      durations: z.object({
        workMs: z.number(),
        pauseMs: z.number(),
        productivePauseMs: z.number(),
        totalMs: z.number(),
      }),
      /** Время сервера — чтобы таймер на клиенте не расходился из-за часов пользователя. */
      serverTime: z.string(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    addComment: publicProcedure.input(z.object({
      sessionId: z.uuid(),
      comment: z.string().min(1, 'Комментарий не может быть пустым').max(500),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    adjustSession: publicProcedure.input(z.object({
      sessionId: z.uuid(),
      /** ISO-время начала смены. */
      startedAt: z.string(),
      /** ISO-время окончания; null — смена снова считается активной. */
      stoppedAt: z.string().nullable(),
      /** Причина корректировки — попадёт в журнал. */
      comment: z.string().max(500).optional(),
    })).output(z.object({
      id: z.uuid(),
      assignmentId: z.uuid(),
      startedAt: z.string(),
      stoppedAt: z.string().nullable(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  })
});
export type AppRouter = typeof appRouter;

