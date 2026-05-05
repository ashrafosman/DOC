from __future__ import annotations
from typing import Annotated, AsyncGenerator, TypeAlias, Any
from contextlib import asynccontextmanager

try:
    from databricks.sdk import WorkspaceClient
except ImportError:
    class WorkspaceClient:  # type: ignore[no-redef]
        """Stub used when databricks-sdk is not installed."""
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise ImportError("databricks-sdk is not installed")

from fastapi import Depends, FastAPI, Request

from ._base import LifespanDependency
from ._config import AppConfig, logger
from ._headers import HeadersDependency


class _ConfigDependency(LifespanDependency):
    @asynccontextmanager
    async def lifespan(self, app: FastAPI) -> AsyncGenerator[None, None]:
        app.state.config = AppConfig()
        logger.info(f"Starting app with configuration:\n{app.state.config}")
        yield

    @staticmethod
    def __call__(request: Request) -> AppConfig:
        return request.app.state.config


class _WorkspaceClientDependency(LifespanDependency):
    @asynccontextmanager
    async def lifespan(self, app: FastAPI) -> AsyncGenerator[None, None]:
        if WorkspaceClient is None:
            app.state.workspace_client = None
        else:
            try:
                app.state.workspace_client = WorkspaceClient()
            except Exception as e:
                logger.warning(f"WorkspaceClient unavailable (no Databricks credentials): {e}")
                app.state.workspace_client = None
        yield

    @staticmethod
    def __call__(request: Request) -> Any:
        return request.app.state.workspace_client


def _get_user_ws(
    headers: HeadersDependency,
) -> Any:
    """
    Returns a Databricks Workspace client with authentication behalf of user.
    If the request contains an X-Forwarded-Access-Token header, on behalf of user authentication is used.

    Example usage: `user_ws: Dependencies.UserClient`
    """

    if not headers.token:
        raise ValueError(
            "OBO token is not provided in the header X-Forwarded-Access-Token"
        )

    if WorkspaceClient is None:
        raise ValueError("databricks-sdk not installed")
    return WorkspaceClient(
        token=headers.token.get_secret_value(), auth_type="pat"
    )  # set pat explicitly to avoid issues with SP client


ConfigDependency: TypeAlias = Annotated[AppConfig, _ConfigDependency.depends()]

ClientDependency: TypeAlias = Annotated[Any, _WorkspaceClientDependency.depends()]

UserWorkspaceClientDependency: TypeAlias = Annotated[Any, Depends(_get_user_ws)]
