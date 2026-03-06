import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: '회원가입',
    description: '새로운 사용자를 등록합니다.',
  })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);

    // Set refresh token as HttpOnly cookie
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description: '사용자 로그인을 처리합니다.',
  })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set refresh token as HttpOnly cookie
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '토큰 갱신',
    description: 'Refresh Token을 사용하여 새로운 Access Token을 발급합니다.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '유효하지 않은 Refresh Token' })
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );

    // Set new refresh token as HttpOnly cookie
    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description: '사용자 로그아웃 처리 및 Refresh Token을 무효화합니다.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.id);

    // Clear refresh token cookie
    response.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }
}
