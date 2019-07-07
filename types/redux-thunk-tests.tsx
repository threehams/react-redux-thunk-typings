import { applyMiddleware, bindActionCreators, createStore } from "redux";

import thunk, {
  ThunkAction,
  ThunkActionDispatch,
  ThunkDispatch,
  ThunkMiddleware
} from "redux-thunk";
import { Assert, IsExact } from "conditional-type-checks";

interface State {
  foo: string;
}

type Actions = { type: "FOO" } | { type: "BAR"; result: number };

type ThunkResult<R> = ThunkAction<R, State, undefined, Actions>;

const initialState: State = {
  foo: "foo"
};

function fakeReducer(state: State = initialState, action: Actions): State {
  return state;
}

const store = createStore(
  fakeReducer,
  applyMiddleware(thunk as ThunkMiddleware<State, Actions>)
);

store.dispatch(dispatch => {
  type Param = Parameters<typeof dispatch>[0];
  type TestParam = Assert<
    IsExact<Param, { type: "FOO" } | { type: "BAR"; result: number }>,
    true
  >;
});

function testGetState(): ThunkResult<void> {
  return (dispatch, getState) => {
    const state = getState();
    type TestState = Assert<IsExact<typeof state.foo, string>, true>;
    type Param = Parameters<typeof dispatch>[0];
    type TestParam = Assert<
      IsExact<Param, { type: "FOO" } | { type: "BAR"; result: number }>,
      true
    >;
    // Can dispatch another thunk action
    dispatch(anotherThunkAction());
  };
}

function anotherThunkAction(): ThunkResult<string> {
  return (dispatch, getState) => {
    dispatch({ type: "FOO" });
    return "hello";
  };
}

function promiseThunkAction(): ThunkResult<Promise<boolean>> {
  return async (dispatch, getState) => {
    dispatch({ type: "FOO" });
    return false;
  };
}

const standardAction = () => ({ type: "FOO" });

() => {
  interface ActionDispatchs {
    anotherThunkAction: ThunkActionDispatch<typeof anotherThunkAction>;
    promiseThunkAction: ThunkActionDispatch<typeof promiseThunkAction>;
    standardAction: typeof standardAction;
  }

  // test that bindActionCreators correctly returns actions responses of ThunkActions
  // also ensure standard action creators still work as expected
  const actions: ActionDispatchs = bindActionCreators(
    {
      anotherThunkAction,
      promiseThunkAction,
      standardAction
    },
    store.dispatch
  );

  actions.anotherThunkAction() === "hello";
  actions.anotherThunkAction() === false; // $ExpectError
  actions.promiseThunkAction().then(res => console.log(res));
  actions.promiseThunkAction().prop; // $ExpectError
  actions.standardAction().type;
  actions.standardAction().other; // $ExpectError
};

store.dispatch({ type: "FOO" });
store.dispatch({ type: "BAR" }); // $ExpectError
store.dispatch({ type: "BAR", result: 5 });
store.dispatch({ type: "BAZ" }); // $ExpectError
store.dispatch(testGetState());

const storeThunkArg = createStore(
  fakeReducer,
  applyMiddleware(thunk.withExtraArgument("bar") as ThunkMiddleware<
    State,
    Actions,
    string
  >)
);

storeThunkArg.dispatch((dispatch, getState, extraArg) => {
  type TestExtraArg = Assert<IsExact<typeof extraArg, string>, true>;
  type Param = Parameters<typeof store.dispatch>[0];
  type Test = Assert<
    IsExact<Param, { type: "FOO" } | { type: "BAR"; result: number }>,
    true
  >;
});

const callDispatchAsync_anyAction = (
  dispatch: ThunkDispatch<State, undefined, any>
) => {
  const asyncThunk = (): ThunkResult<Promise<void>> => () =>
    ({} as Promise<void>);
  dispatch(asyncThunk()).then(() => console.log("done"));
};
const callDispatchAsync_specificActions = (
  dispatch: ThunkDispatch<State, undefined, Actions>
) => {
  const asyncThunk = (): ThunkResult<Promise<void>> => () =>
    ({} as Promise<void>);
  dispatch(asyncThunk()).then(() => console.log("done"));
};
const callDispatchAny = (
  dispatch: ThunkDispatch<State, undefined, Actions>
) => {
  const asyncThunk = (): any => () => ({} as Promise<void>);
  dispatch(asyncThunk()) // result is any
    .then(() => console.log("done"));
};
