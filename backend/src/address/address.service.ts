import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // GET ALL ADDRESSES
  // =====================================================

  async getAddresses(userId: string) {
    const addresses =
      await this.prisma.address.findMany({
        where: {
          userId,
        },

        orderBy: [
          {
            isDefault: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

    return {
      addresses,
      count: addresses.length,
    };
  }

  // =====================================================
  // GET SINGLE ADDRESS
  // =====================================================

  async getAddress(
    userId: string,
    addressId: string,
  ) {
    const address =
      await this.prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

    if (!address) {
      throw new NotFoundException(
        'Address not found',
      );
    }

    return address;
  }

  // =====================================================
  // CREATE ADDRESS
  // =====================================================

  async createAddress(
    userId: string,
    dto: CreateAddressDto,
  ) {
    const existingAddressCount =
      await this.prisma.address.count({
        where: {
          userId,
        },
      });

    /*
     * First address is ALWAYS default.
     *
     * If user explicitly sends isDefault=true,
     * this address also becomes default.
     */
    const shouldBeDefault =
      existingAddressCount === 0 ||
      dto.isDefault === true;

    const address =
      await this.prisma.$transaction(
        async (tx) => {
          // ---------------------------------------------
          // Remove previous default
          // ---------------------------------------------

          if (shouldBeDefault) {
            await tx.address.updateMany({
              where: {
                userId,
                isDefault: true,
              },

              data: {
                isDefault: false,
              },
            });
          }

          // ---------------------------------------------
          // Create address
          // ---------------------------------------------

          return tx.address.create({
            data: {
              userId,

              type: dto.type,

              name: dto.name.trim(),

              phone: dto.phone.trim(),

              addressLine1:
                dto.addressLine1.trim(),

              addressLine2:
                dto.addressLine2?.trim() || null,

              landmark:
                dto.landmark?.trim() || null,

              city: dto.city.trim(),

              state: dto.state.trim(),

              pincode: dto.pincode.trim(),

              latitude: dto.latitude,

              longitude: dto.longitude,

              isDefault: shouldBeDefault,
            },
          });
        },
      );

    return address;
  }

  // =====================================================
  // UPDATE ADDRESS
  // =====================================================

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const existingAddress =
      await this.prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

    if (!existingAddress) {
      throw new NotFoundException(
        'Address not found',
      );
    }

    // ---------------------------------------------------
    // Prevent empty PATCH payload
    // ---------------------------------------------------

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one address field is required',
      );
    }

    /*
     * If user is explicitly setting this address
     * as default, remove default from all others.
     */
    const makeDefault =
      dto.isDefault === true;

    /*
     * If the current default address is explicitly
     * changed to false, do not leave the user without
     * a default address.
     *
     * Instead, we keep the existing default.
     */
    const removingDefault =
      existingAddress.isDefault &&
      dto.isDefault === false;

    const address =
      await this.prisma.$transaction(
        async (tx) => {
          // ---------------------------------------------
          // Make this address default
          // ---------------------------------------------

          if (makeDefault) {
            await tx.address.updateMany({
              where: {
                userId,
                id: {
                  not: addressId,
                },
                isDefault: true,
              },

              data: {
                isDefault: false,
              },
            });
          }

          // ---------------------------------------------
          // Build update object
          // ---------------------------------------------

          const data: Record<
            string,
            unknown
          > = {};

          if (dto.type !== undefined) {
            data.type = dto.type;
          }

          if (dto.name !== undefined) {
            const value =
              dto.name.trim();

            if (!value) {
              throw new BadRequestException(
                'Name cannot be empty',
              );
            }

            data.name = value;
          }

          if (dto.phone !== undefined) {
            data.phone =
              dto.phone.trim();
          }

          if (
            dto.addressLine1 !==
            undefined
          ) {
            const value =
              dto.addressLine1.trim();

            if (!value) {
              throw new BadRequestException(
                'Address line 1 cannot be empty',
              );
            }

            data.addressLine1 = value;
          }

          if (
            dto.addressLine2 !==
            undefined
          ) {
            data.addressLine2 =
              dto.addressLine2.trim() ||
              null;
          }

          if (
            dto.landmark !==
            undefined
          ) {
            data.landmark =
              dto.landmark.trim() ||
              null;
          }

          if (dto.city !== undefined) {
            const value =
              dto.city.trim();

            if (!value) {
              throw new BadRequestException(
                'City cannot be empty',
              );
            }

            data.city = value;
          }

          if (dto.state !== undefined) {
            const value =
              dto.state.trim();

            if (!value) {
              throw new BadRequestException(
                'State cannot be empty',
              );
            }

            data.state = value;
          }

          if (
            dto.pincode !==
            undefined
          ) {
            data.pincode =
              dto.pincode.trim();
          }

          if (
            dto.latitude !==
            undefined
          ) {
            data.latitude =
              dto.latitude;
          }

          if (
            dto.longitude !==
            undefined
          ) {
            data.longitude =
              dto.longitude;
          }

          // ---------------------------------------------
          // Default handling
          // ---------------------------------------------

          if (makeDefault) {
            data.isDefault = true;
          } else if (
            dto.isDefault !==
              undefined &&
            !removingDefault
          ) {
            data.isDefault =
              dto.isDefault;
          }

          /*
           * Do not allow the only/current default
           * to become non-default through PATCH.
           */
          if (removingDefault) {
            data.isDefault = true;
          }

          // ---------------------------------------------
          // Update
          // ---------------------------------------------

          return tx.address.update({
            where: {
              id: addressId,
            },

            data,
          });
        },
      );

    return address;
  }

  // =====================================================
  // SET DEFAULT ADDRESS
  // =====================================================

  async setDefaultAddress(
    userId: string,
    addressId: string,
  ) {
    const address =
      await this.prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },

        select: {
          id: true,
          isDefault: true,
        },
      });

    if (!address) {
      throw new NotFoundException(
        'Address not found',
      );
    }

    if (address.isDefault) {
      return {
        addressId,
        isDefault: true,
      };
    }

    await this.prisma.$transaction(
      async (tx) => {
        // ---------------------------------------------
        // Remove current default
        // ---------------------------------------------

        await tx.address.updateMany({
          where: {
            userId,
            isDefault: true,
          },

          data: {
            isDefault: false,
          },
        });

        // ---------------------------------------------
        // Set requested address as default
        // ---------------------------------------------

        await tx.address.update({
          where: {
            id: addressId,
          },

          data: {
            isDefault: true,
          },
        });
      },
    );

    return {
      addressId,
      isDefault: true,
    };
  }

  // =====================================================
  // DELETE ADDRESS
  // =====================================================

  async deleteAddress(
    userId: string,
    addressId: string,
  ) {
    const address =
      await this.prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },

        select: {
          id: true,
          isDefault: true,
        },
      });

    if (!address) {
      throw new NotFoundException(
        'Address not found',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        // ---------------------------------------------
        // Delete address
        // ---------------------------------------------

        await tx.address.delete({
          where: {
            id: addressId,
          },
        });

        // ---------------------------------------------
        // If deleted address was default,
        // promote newest remaining address.
        // ---------------------------------------------

        if (address.isDefault) {
          const nextAddress =
            await tx.address.findFirst({
              where: {
                userId,
              },

              orderBy: {
                createdAt: 'desc',
              },

              select: {
                id: true,
              },
            });

          if (nextAddress) {
            await tx.address.update({
              where: {
                id: nextAddress.id,
              },

              data: {
                isDefault: true,
              },
            });
          }
        }
      },
    );

    return {
      addressId,
      deleted: true,
    };
  }
}